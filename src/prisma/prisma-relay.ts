//@ts-expect-error
import { Prisma, PrismaClient } from '@libs/prisma-custom-relay-pagination/client';
import { CursorList, CursorObject, Page, PrismaCursor, RelayPagination } from './prisma-relay.type';

//@ts-ignore
export class PrismaRelay<T extends Prisma.ModelName>
{
    private _defaultButtons = 5;
    private _page: Page | null = null;
    private _cursor: PrismaCursor | undefined = undefined;

    constructor(
        private readonly prisma: PrismaClient,
        private readonly args: CursorObject<T>
    )
    {
        if (typeof this.args?.buttons === 'number')
        {
            this._defaultButtons = this.args.buttons;
        }
    }

    private async decryptCursor()
    {
        if (typeof this.args?.pagination?.cursor === 'undefined' || this.args?.pagination?.cursor === null)
        {
            return undefined;
        }

        const decryptedCursor = Buffer.from(this.args.pagination.cursor, 'base64').toString('ascii').slice(9);
        const parseCursor = decryptedCursor.match(/[a-zA-Z]/) === null ? parseInt(decryptedCursor) : decryptedCursor;
        //@ts-ignore
        const model = await this.prisma[this.args.model].findFirst({
            select: { id: true },
            cursor: { id: parseCursor }
        });

        return model !== null ? { id: model.id } : undefined;
    }

    private async findPagination()
    {
        const [ total, remain ] = await this.prisma.$transaction([
            //@ts-ignore
            this.prisma[this.args.model].count({
                where: this.args?.where ?? undefined,
                orderBy: this.args?.orderBy ?? undefined
            }),
            //@ts-ignore
            this.prisma[this.args.model].findMany({
                select: { id: true },
                cursor: this._cursor ?? undefined,
                where: this.args?.where ?? undefined,
                orderBy: this.args?.orderBy ?? undefined
            })
        ]);

        const itemsExists = typeof this.args?.pagination?.items === 'number';
        const page = itemsExists ? Math.ceil((total - remain.length) / this.args.pagination!.items!) : 0;
        const fixedPage = page === 0 ? 1 : page + 1;

        return { total: total, remain: remain.length, currentPage: fixedPage };
    }

    private async getPageEdges()
    {
        const edges = [];
        let select = undefined;

        if (typeof this.args?.select !== 'undefined')
        {
            select = { ...this.args?.select, id: true };
        }

        const itemsExists = typeof this.args?.pagination?.items === 'number';
        //@ts-ignore
        const resultList = await this.prisma[this.args.model].findMany({
            select: select,
            cursor: this._cursor ?? undefined,
            omit: this.args?.omit ?? undefined,
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined,
            include: this.args?.include ?? undefined,
            take: itemsExists ? this.args.pagination!.items! : undefined
        });

        for(const result of resultList)
        {
            edges.push({
                node: result,
                cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
            });
        }

        return edges;
    }

    private generatePagination()
    {
        const totalPages = Math.ceil(this._page!.total / this.args.pagination!.items!);
        let firstPage = Math.floor(this._defaultButtons / 2);
        let lastPage = Math.floor(this._defaultButtons / 2);

        if (this._page!.currentPage - firstPage <= 0)
        {
            lastPage += firstPage - this._page!.currentPage + 1;
            firstPage = this._page!.currentPage - 1;
        }

        if (this._page!.currentPage + lastPage > totalPages)
        {
            firstPage += lastPage - (totalPages - this._page!.currentPage);
            lastPage = totalPages - this._page!.currentPage;
        }

        const pageList: number[] = [];
        const firstArrayPage = this._page!.currentPage - firstPage;
        const firstIndex = firstArrayPage <= 0 ? 1 : firstArrayPage;
        for (let i = firstIndex; i <= this._page!.currentPage + lastPage; i++)
        {
            pageList.push(i);
        }

        return pageList;
    }

    private async getNearCursors()
    {
        const cursorList = [];
        const paginationList = this.generatePagination();

        for(const pagination of paginationList)
        {
            const currentItem = (pagination - this._page!.currentPage) * this.args.pagination!.items;
            const take = currentItem < 0 ? -1 : 1;
            const skip = Math.abs(currentItem);

            //@ts-ignore
            const [ result ] = await this.prisma[this.args.model].findMany({
                take: take,
                skip: skip,
                select: { id: true },
                cursor: this._cursor ?? undefined,
                where: this.args?.where ?? undefined,
                orderBy: this.args?.orderBy ?? undefined
            });

            if (typeof result === 'undefined' || result === null)
            {
                throw new Error('Page cursor out of range, reset the cursor and try again.');
            }

            cursorList.push({
                page: pagination,
                isCurrent: currentItem === 0,
                cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
            });
        }

        return cursorList;
    }

    private async getAdjacentCursors(cursorList: CursorList)
    {
        const currentPage = cursorList!.findIndex((item) => item!.page === this._page!.currentPage);
        if (currentPage === -1) return { previous: null, next: null };

        return {
            previous: cursorList![currentPage - 1] ?? null,
            next: cursorList![currentPage + 1] ?? null
        };
    }

    private async getFirstCursor()
    {
        if (this._page!.currentPage === 1)
        {
            return null;
        }

        //@ts-ignore
        const result = await this.prisma[this.args.model].findFirst({
            select: { id: true },
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined
        });

        return {
            page: 1,
            isCurrent: false,
            cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
        };
    }

    private async getLastCursor()
    {
        if (this._page!.remain <= this.args.pagination!.items!)
        {
            return null;
        }

        const remainderItems = this._page!.total % this.args.pagination!.items!;
        const skip = remainderItems === 0 ? this.args.pagination!.items! : remainderItems;

        //@ts-ignore
        const [ result ] = await this.prisma[this.args.model].findMany({
            take: -1,
            skip: skip - 1,
            select: { id: true },
            where: this.args?.where ?? undefined,
            orderBy: this.args?.orderBy ?? undefined
        });

        return {
            isCurrent: false,
            page: Math.ceil(this._page!.total / this.args.pagination!.items!),
            cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
        };
    }

    private async getPageCursors()
    {
        const cursorList = await this.getNearCursors();
        const nextToCursors = await this.getAdjacentCursors(cursorList);
        const firstCursor = await this.getFirstCursor();
        const lastCursor = await this.getLastCursor();

        return {
            ...nextToCursors,
            first: firstCursor,
            last: lastCursor,
            around: cursorList
        };
    }

    async paginate<M>(): Promise<RelayPagination<M>>
    {
        this._cursor = await this.decryptCursor();
        this._page = await this.findPagination();
        const pageEdges = await this.getPageEdges();
        const itemsNotExist = typeof this.args?.pagination?.items !== 'number' || this.args?.pagination?.items >= this._page.total;
        const pageCursors = itemsNotExist ? null : await this.getPageCursors();

        return {
            pageEdges: pageEdges,
            pageCursors: pageCursors,
            totalCount: this._page.total
        };
    }
}