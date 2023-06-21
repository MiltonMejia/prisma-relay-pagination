import { PrismaClient } from '@prisma/client';
import { CursorList, CursorObject, Page, PrismaCursor, PrismaManyArgs, RelayPagination } from './types';

export class PrismaRelay<T extends PrismaManyArgs> {
	private args: CursorObject<T> | null = null;
	private prisma: PrismaClient = null;
	private cursor: PrismaCursor = undefined;
	private page: Page = null;

	constructor(prisma: PrismaClient, args: CursorObject<T>) {
		this.prisma = prisma;
		this.args = args;
	}

	private async decryptCursor() {
		if (this.args?.cursor === null || typeof this.args?.cursor === 'undefined') return undefined;
		const decryptedCursor = Buffer.from(this.args!.cursor, 'base64').toString('ascii').slice(9);
		const parseCursor = isNaN(parseInt(decryptedCursor)) ? decryptedCursor : parseInt(decryptedCursor);
		const model = await this.prisma[this.args!.model].findFirst({
			select: { id: true },
			cursor: { id: parseCursor },
		});

		return model !== null ? { id: model.id } : undefined;
	}

	private async findPagination() {
		const [total, remain] = await this.prisma.$transaction([
			this.prisma[this.args!.model].count({
				where: this.args?.where ?? undefined,
				orderBy: this.args?.orderBy ?? undefined,
			}),
			this.prisma[this.args!.model].findMany({
				select: { id: true },
				cursor: this.cursor,
				where: this.args?.where ?? undefined,
				orderBy: this.args?.orderBy ?? undefined,
			}),
		]);

		const page = this.args.take !== null ? Math.ceil((total - remain.length) / this.args!.take) : 0;
		const fixedPage = page === 0 ? 1 : page + 1;
		return { total: total, remain: remain.length, currentPage: fixedPage };
	}

	private generatePagination() {
		const totalPages = Math.ceil(this.page!.total / this.args!.take);
		let firstPage = Math.floor(this.args!.buttons / 2);
		let lastPage = Math.floor(this.args!.buttons / 2);

		if (this.page!.currentPage - firstPage <= 0) {
			lastPage += firstPage - this.page!.currentPage + 1;
			firstPage = this.page!.currentPage - 1;
		}

		if (this.page!.currentPage + lastPage > totalPages) {
			firstPage += lastPage - (totalPages - this.page!.currentPage);
			lastPage = totalPages - this.page!.currentPage;
		}

		const pageList: number[] = [];
		const firstArrayPage = this.page!.currentPage - firstPage;
		const firstIndex = firstArrayPage <= 0 ? 1 : firstArrayPage;
		for (let i = firstIndex; i <= this.page!.currentPage + lastPage; i++) {
			pageList.push(i);
		}

		return pageList;
	}

	private async getNearCursors() {
		const cursorList = [];
		const pagination = this.generatePagination();

		for (let i = 0; i < pagination.length; i++) {
			let take = undefined;
			let skip = undefined;
			const skipItems = (pagination[i] - this.page!.currentPage) * this.args!.take;

			switch (true) {
				case skipItems < 0:
					take = skipItems;
					skip = 1;
					break;
				case skipItems > 0:
					take = 1;
					skip = skipItems;
					break;
				default:
					take = 1;
					skip = 0;
			}

			const data = await this.prisma[this.args!.model].findFirst({
				cursor: this.cursor,
				select: { id: true },
				take: take,
				skip: skip,
				where: this.args?.where ?? undefined,
				orderBy: this.args?.orderBy ?? undefined,
			});
			cursorList.push({
				isCurrent: skipItems === 0,
				page: pagination[i],
				cursor: Buffer.from('saltysalt'.concat(String(data.id))).toString('base64'),
			});
		}
		return cursorList;
	}

	private async getAdjacentCursors(cursorList: CursorList) {
		const currentPage = cursorList!.findIndex((item) => item!.page === this.page!.currentPage);
		if (currentPage === -1) return { previous: null, next: null };

		return {
			previous: cursorList![currentPage - 1] ?? null,
			next: cursorList![currentPage + 1] ?? null,
		};
	}

	private async getFirstRecord() {
		if (this.page!.currentPage === 1) {
			return null;
		}

		const data = await this.prisma[this.args!.model].findFirst({
			take: 1,
			select: this.args?.select ?? undefined,
			where: this.args?.where ?? undefined,
			orderBy: this.args?.orderBy ?? undefined,
		});

		return {
			isCurrent: false,
			page: 1,
			cursor: Buffer.from('saltysalt'.concat(String(data.id))).toString('base64'),
		};
	}

	private async getLastRecord() {
		if (this.page!.remain === this.args!.take || this.page!.remain < this.args!.take) {
			return null;
		}

		const take = () => {
			const secondLastRecords = Math.floor(this.page.total / this.args.take) * this.args.take;
			const take = this.page.total - secondLastRecords;
			return take === 0 ? -this.args.take : -take;
		};

		const data = await this.prisma[this.args!.model].findFirst({
			take: take(),
			select: this.args?.select ?? undefined,
			where: this.args?.where ?? undefined,
			orderBy: this.args?.orderBy ?? undefined,
		});

		return {
			isCurrent: false,
			page: Math.ceil(this.page!.total / this.args!.take),
			cursor: Buffer.from('saltysalt'.concat(String(data.id))).toString('base64'),
		};
	}

	private async getPageEdges() {
		const edges = [];
		let select = undefined;

		if (typeof this.args?.select !== 'undefined') {
			select = { ...this.args?.select, id: true };
		}

		const data = await this.prisma[this.args!.model].findMany({
			cursor: this.cursor,
			take: this.args!.take === null ? undefined : this.args!.take,
			select: select,
			where: this.args?.where ?? undefined,
			orderBy: this.args?.orderBy ?? undefined,
		});

		for (let i = 0; i < data.length; i++) {
			edges.push({
				cursor: Buffer.from('saltysalt'.concat(String(data[i].id))).toString('base64'),
				node: data[i],
			});
		}

		return edges;
	}

	private async getPageCursors() {
		const cursorList = await this.getNearCursors();
		const nextToCursors = await this.getAdjacentCursors(cursorList);
		const firstCursor = await this.getFirstRecord();
		const lastCursor = await this.getLastRecord();

		return {
			...nextToCursors,
			first: firstCursor,
			last: lastCursor,
			around: cursorList,
		};
	}

	async paginate<M>(): Promise<RelayPagination<M>> {
		this.cursor = await this.decryptCursor();
		this.page = await this.findPagination();
		const pageEdges = await this.getPageEdges();

		if (this.args.take === null) {
			return {
				pageEdges: pageEdges,
				pageCursors: null,
				totalCount: this.page.total,
			};
		}

		const pageCursors = await this.getPageCursors();
		return {
			pageEdges: pageEdges,
			pageCursors: pageCursors,
			totalCount: this.page.total,
		};
	}
}
