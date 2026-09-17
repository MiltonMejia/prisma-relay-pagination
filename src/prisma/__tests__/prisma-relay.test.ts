import { decodeCursor } from '../cursor.js';
import { PrismaRelay } from '../prisma-relay.js';

type Row = { id: number; name: string };

function createPrisma(rows: Row[])
{
	const data = [ ...rows ].sort((a, b) => a.id - b.id);

	const delegate = {
		count: async () => data.length,
		findMany: async (args: Record<string, unknown> = {}) =>
		{
			const cursor = args.cursor as { id: number } | undefined;
			const skip = (args.skip as number | undefined) ?? 0;
			const take = args.take as number | undefined;
			const start = typeof cursor === 'undefined' ? 0 : Math.max(data.findIndex((row) => row.id === cursor.id), 0);

			if (typeof take === 'undefined') return data.slice(start + skip);
			if (take >= 0) return data.slice(start + skip, start + skip + take);

			const end = start - skip;

			return data.slice(Math.max(end + take + 1, 0), end + 1);
		}
	};

	return {
		user: delegate,
		$transaction: async (queries: Array<Promise<unknown>>) => Promise.all(queries)
	};
}

function paginate(prisma: ReturnType<typeof createPrisma>, args: Record<string, unknown>)
{
	return new PrismaRelay(prisma as never, { model: 'user', ...args } as never).paginate<Row>();
}

describe('PrismaRelay.paginate', () =>
{
	const rows: Row[] = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, name: `user_${index + 1}` }));

	it('returns the first page with its cursors', async () =>
	{
		const result = await paginate(createPrisma(rows), { pagination: { items: 10 } });

		expect(result.totalCount).toBe(25);
		expect(result.pageEdges.map((edge) => edge.node.id)).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]);
		expect(result.pageCursors!.around.map((cursor) => cursor!.page)).toEqual([ 1, 2, 3 ]);
		expect(result.pageCursors!.previous).toBeNull();
		expect(result.pageCursors!.first).toBeNull();
		expect(result.pageCursors!.next!.page).toBe(2);
		expect(result.pageCursors!.last!.page).toBe(3);
	});

	it('navigates to the next page using the emitted cursor', async () =>
	{
		const prisma = createPrisma(rows);
		const first = await paginate(prisma, { pagination: { items: 10 } });
		const second = await paginate(prisma, { pagination: { items: 10, cursor: first.pageCursors!.next!.cursor } });

		expect(second.pageEdges.map((edge) => edge.node.id)).toEqual([ 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]);
		expect(second.pageCursors!.previous!.page).toBe(1);
		expect(second.pageCursors!.next!.page).toBe(3);
		expect(second.pageCursors!.first!.page).toBe(1);
		expect(second.pageCursors!.last!.page).toBe(3);
	});

	it('navigates backwards to a previous page', async () =>
	{
		const prisma = createPrisma(rows);
		const first = await paginate(prisma, { pagination: { items: 10 } });
		const second = await paginate(prisma, { pagination: { items: 10, cursor: first.pageCursors!.next!.cursor } });
		const third = await paginate(prisma, { pagination: { items: 10, cursor: second.pageCursors!.next!.cursor } });

		expect(third.pageEdges.map((edge) => edge.node.id)).toEqual([ 21, 22, 23, 24, 25 ]);
		expect(third.pageCursors!.last).toBeNull();

		const backToSecond = await paginate(prisma, { pagination: { items: 10, cursor: third.pageCursors!.previous!.cursor } });

		expect(backToSecond.pageEdges.map((edge) => edge.node.id)).toEqual([ 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]);
	});

	it('builds cursors from the id even when the id is omitted from the node', async () =>
	{
		const result = await paginate(createPrisma(rows), { omit: { id: true }, pagination: { items: 10 } });

		expect(result.pageEdges).toHaveLength(10);
		expect(result.pageEdges[0].node).not.toHaveProperty('id');
		expect(decodeCursor(result.pageEdges[0].cursor)).toEqual({ id: 1, page: 1 });
	});

	it('returns every row without cursors when pagination is not requested', async () =>
	{
		const result = await paginate(createPrisma(rows), {});

		expect(result.totalCount).toBe(25);
		expect(result.pageEdges).toHaveLength(25);
		expect(result.pageCursors).toBeNull();
	});

	it('accepts signed cursors when a secret is configured', async () =>
	{
		const prisma = createPrisma(rows);
		const first = await paginate(prisma, { cursorSecret: 's3cret', pagination: { items: 10 } });
		const second = await paginate(prisma, { cursorSecret: 's3cret', pagination: { items: 10, cursor: first.pageCursors!.next!.cursor } });

		expect(second.pageEdges.map((edge) => edge.node.id)).toEqual([ 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 ]);
	});

	it('rejects signed cursors that do not match the configured secret', async () =>
	{
		const prisma = createPrisma(rows);
		const first = await paginate(prisma, { cursorSecret: 's3cret', pagination: { items: 10 } });

		await expect(paginate(prisma, { cursorSecret: 'other', pagination: { items: 10, cursor: first.pageCursors!.next!.cursor } }))
			.rejects.toThrow('Invalid cursor signature');
	});
});
