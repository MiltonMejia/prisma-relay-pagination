import { Prisma, PrismaClient } from '@libs/prisma-custom-relay-pagination/client';
import { decodeCursor, encodeCursor, DecodedCursor } from './cursor.js';
import { generatePageList } from './pagination.js';
import { Cursor, CursorObject, Page, PageCursor, PageEdge, PrismaCursor, RelayPagination } from './prisma-relay.type.js';

const DEFAULT_BUTTONS = 5;

//@ts-ignore
export class PrismaRelay<T extends Prisma.ModelName>
{
    private readonly _defaultButtons: number;
    private readonly _items: number | undefined;
    private readonly _secret: string | undefined;
    private _page: Page = null;
    private _cursor: PrismaCursor = undefined;

    constructor(
        private readonly prisma: PrismaClient,
        private readonly args: CursorObject<T>
    )
    {
        const buttons = this.args?.buttons;
        this._defaultButtons = typeof buttons === 'number' && Number.isInteger(buttons) && buttons > 0 ? buttons : DEFAULT_BUTTONS;
        this._items = typeof this.args?.pagination?.items === 'number' ? this.args.pagination.items : undefined;
        this._secret = this.args?.cursorSecret;
    }

    private decodeInputCursor(): DecodedCursor | undefined
    {
        const cursor = this.args?.pagination?.cursor;

        if (typeof cursor === 'undefined' || cursor === null || cursor === '')
        {
            return undefined;
        }

        return decodeCursor(cursor, this._secret);
    }

    private countTotal()
    {
        return this.prisma[this.args.model].count({
            where: this.args?.where ?? undefined
        });
    }

    private edgesQuery()
    {
        let select = undefined;
        let omit = undefined;

        if (typeof this.args?.select !== 'undefined')
        {
            select = { ...this.args.select, id: true };
        }
        else if (typeof this.args?.omit !== 'undefined')
        {
            omit = { ...this.args.omit } as Record<string, boolean>;

            if (omit.id === true)
            {
                omit.id = false;
            }
        }

        return this.prisma[this.args.model].findMany({
            select: select,
            cursor: this._cursor ?? undefined,
            omit: omit,
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined,
            include: this.args?.include ?? undefined,
            take: this._items
        });
    }

    private toPageEdges<M>(resultList: M[]): PageEdge<M>[]
    {
        const omitId = typeof this.args?.omit !== 'undefined' && (this.args.omit as Record<string, boolean>).id === true;

        return resultList.map((result) =>
        {
            const row = result as Record<string, unknown>;
            const cursor = encodeCursor(row.id as string | number | bigint, this._page!.currentPage, this._secret);
            const node = omitId ? this.withoutId(row) : result;

            return { node: node as M, cursor: cursor };
        });
    }

    private withoutId(row: Record<string, unknown>): Record<string, unknown>
    {
        const clone = { ...row };
        delete clone.id;

        return clone;
    }

    private nearCursorQuery(page: number)
    {
        const currentItem = (page - this._page!.currentPage) * this._items!;

        return this.prisma[this.args.model].findMany({
            take: currentItem < 0 ? -1 : 1,
            skip: Math.abs(currentItem),
            select: { id: true },
            cursor: this._cursor ?? undefined,
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined
        });
    }

    private firstCursorQuery()
    {
        return this.prisma[this.args.model].findMany({
            take: 1,
            select: { id: true },
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined
        });
    }

    private lastCursorQuery()
    {
        const remainderItems = this._page!.total % this._items!;
        const skip = remainderItems === 0 ? this._items! : remainderItems;

        return this.prisma[this.args.model].findMany({
            take: -1,
            skip: skip - 1,
            select: { id: true },
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined
        });
    }

    private lastPage()
    {
        return Math.ceil(this._page!.total / this._items!);
    }

    private toCursor(rows: Array<{ id: string | number | bigint }>, page: number): Cursor
    {
        const [ row ] = rows;

        if (typeof row === 'undefined' || row === null)
        {
            throw new Error('Page cursor out of range, reset the cursor and try again.');
        }

        return {
            page: page,
            isCurrent: page === this._page!.currentPage,
            cursor: encodeCursor(row.id, page, this._secret)
        };
    }

    private getAdjacentCursors(cursorList: Cursor[])
    {
        const currentIndex = cursorList.findIndex((item) => item !== null && item.page === this._page!.currentPage);

        if (currentIndex === -1)
        {
            return { previous: null, next: null };
        }

        return {
            previous: cursorList[currentIndex - 1] ?? null,
            next: cursorList[currentIndex + 1] ?? null
        };
    }

    private async getPageCursors(): Promise<PageCursor>
    {
        const paginationList = generatePageList({
            total: this._page!.total,
            currentPage: this._page!.currentPage,
            items: this._items!,
            buttons: this._defaultButtons
        });

        const nearQueries = paginationList.map((page) => this.nearCursorQuery(page));
        const includeFirst = this._page!.currentPage !== 1;
        const includeLast = this._page!.remain > this._items!;
        const queries = [ ...nearQueries ];

        if (includeFirst)
        {
            queries.push(this.firstCursorQuery());
        }

        if (includeLast)
        {
            queries.push(this.lastCursorQuery());
        }

        const results: Array<Array<{ id: string | number | bigint }>> = await this.prisma.$transaction(queries);

        const around = paginationList.map((page, index) => this.toCursor(results[index], page));
        let cursorIndex = nearQueries.length;
        const first = includeFirst ? this.toCursor(results[cursorIndex++], 1) : null;
        const last = includeLast ? this.toCursor(results[cursorIndex], this.lastPage()) : null;
        const { previous, next } = this.getAdjacentCursors(around);

        return { first: first, previous: previous, around: around, next: next, last: last };
    }

    async paginate<M>(): Promise<RelayPagination<M>>
    {
        const decoded = this.decodeInputCursor();
        this._cursor = decoded ? { id: decoded.id } : undefined;

        const total = await this.countTotal();
        const totalPages = this._items ? Math.max(Math.ceil(total / this._items), 1) : 1;
        const currentPage = this._items ? Math.min(Math.max(decoded?.page ?? 1, 1), totalPages) : 1;
        const remain = this._items ? Math.max(total - (currentPage - 1) * this._items, 0) : total;
        this._page = { total: total, remain: remain, currentPage: currentPage };

        const itemsNotExist = typeof this._items !== 'number' || this._items >= total;

        if (itemsNotExist)
        {
            const resultList = await this.edgesQuery();

            return {
                pageEdges: this.toPageEdges<M>(resultList),
                pageCursors: null,
                totalCount: total
            };
        }

        const [ resultList, pageCursors ] = await Promise.all([ this.edgesQuery(), this.getPageCursors() ]);

        return {
            pageEdges: this.toPageEdges<M>(resultList),
            pageCursors: pageCursors,
            totalCount: total
        };
    }
}
