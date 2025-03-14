import { Prisma, PrismaClient } from '@prisma/client';
import { CursorList, CursorObject, Page, PrismaCursor, RelayPagination } from './prisma-relay.type';

//@ts-ignore
export class PrismaRelay<T extends Prisma.ModelName> {
    private _page: Page | null = null;
    private _cursor: PrismaCursor | undefined = undefined;
    private _defaultButtons = 5;

    constructor(
        private readonly prisma: PrismaClient,
        private readonly args: CursorObject<T>
    ) {
        if (typeof this.args?.buttons === 'number') {
            this._defaultButtons = this.args.buttons;
        }
    }

    private async decryptCursor() {
        if (typeof this.args?.pagination?.cursor === 'undefined') {
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

    private async findPagination() {
        const [total, remain] = await this.prisma.$transaction([
            //@ts-ignore
            this.prisma[this.args.model].count({
                where: this.args?.where,
                orderBy: this.args?.orderBy
            }),
            //@ts-ignore
            this.prisma[this.args.model].count({
                cursor: this._cursor,
                where: this.args?.where,
                orderBy: this.args?.orderBy
            })
        ]);

        const itemsExists = typeof this.args?.pagination?.items === 'number';
        const page = itemsExists ? Math.ceil((total - remain) / this.args.pagination!.items!) : 0;
        const fixedPage = page === 0 ? 1 : page + 1;
        return { total: total, remain: remain, currentPage: fixedPage };
    }

    private async getPageEdges() {
        const edges = [];
        let select = undefined;

        if (typeof this.args?.select !== 'undefined') {
            select = { ...this.args?.select, id: true };
        }

        const itemsExists = typeof this.args?.pagination?.items === 'number';
        //@ts-ignore
        const result = await this.prisma[this.args.model].findMany({
            select: select,
            cursor: this._cursor,
            omit: this.args?.omit,
            where: this.args?.where,
            orderBy: this.args?.orderBy,
            include: this.args?.include,
            take: itemsExists ? this.args.pagination!.items! : undefined
        });

        for (let i = 0; i < result.length; i++) {
            edges.push({
                cursor: Buffer.from('saltysalt'.concat(String(result[i].id))).toString('base64'),
                node: result[i]
            });
        }

        return edges;
    }

    private generatePagination() {
        const totalPages = Math.ceil(this._page!.total / this.args.pagination!.items!);
        let firstPage = Math.floor(this._defaultButtons / 2);
        let lastPage = Math.floor(this._defaultButtons / 2);

        if (this._page!.currentPage - firstPage <= 0) {
            lastPage += firstPage - this._page!.currentPage + 1;
            firstPage = this._page!.currentPage - 1;
        }

        if (this._page!.currentPage + lastPage > totalPages) {
            firstPage += lastPage - (totalPages - this._page!.currentPage);
            lastPage = totalPages - this._page!.currentPage;
        }

        const pageList: number[] = [];
        const firstArrayPage = this._page!.currentPage - firstPage;
        const firstIndex = firstArrayPage <= 0 ? 1 : firstArrayPage;
        for (let i = firstIndex; i <= this._page!.currentPage + lastPage; i++) {
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
            const skipItems = (pagination[i] - this._page!.currentPage) * this.args.pagination?.items!;

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

            //@ts-ignore
            const data = await this.prisma[this.args.model].findFirst({
                take: take,
                skip: skip,
                cursor: this._cursor,
                select: { id: true },
                where: this.args?.where,
                orderBy: this.args?.orderBy
            });
            cursorList.push({
                isCurrent: skipItems === 0,
                page: pagination[i],
                cursor: Buffer.from('saltysalt'.concat(String(data.id))).toString('base64')
            });
        }
        return cursorList;
    }

    private async getAdjacentCursors(cursorList: CursorList) {
        const currentPage = cursorList!.findIndex((item) => item!.page === this._page!.currentPage);
        if (currentPage === -1) return { previous: null, next: null };

        return {
            previous: cursorList![currentPage - 1] ?? null,
            next: cursorList![currentPage + 1] ?? null
        };
    }

    private async getFirstRecord() {
        if (this._page!.currentPage === 1) {
            return null;
        }

        //@ts-ignore
        const result = await this.prisma[this.args.model].findFirst({
            take: 1,
            select: { id: true },
            where: this.args?.where,
            orderBy: this.args?.orderBy
        });

        return {
            isCurrent: false,
            page: 1,
            cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
        };
    }

    private async getLastRecord() {
        if (this._page!.remain === this.args.pagination!.items! || this._page!.remain < this.args.pagination!.items!) {
            return null;
        }

        const take = () => {
            const secondLastRecords = Math.floor(this._page!.total / this.args.pagination!.items!) * this.args.pagination!.items!;
            const take = this._page!.total - secondLastRecords;
            return take === 0 ? -this.args.pagination!.items! : -take;
        };

        //@ts-ignore
        const result = await this.prisma[this.args.model].findFirst({
            take: take(),
            select: { id: true },
            where: this.args?.where,
            orderBy: this.args?.orderBy
        });

        return {
            isCurrent: false,
            page: Math.ceil(this._page!.total / this.args.pagination!.items!),
            cursor: Buffer.from('saltysalt'.concat(String(result.id))).toString('base64')
        };
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
            around: cursorList
        };
    }

    async paginate<M>(): Promise<RelayPagination<M>> {
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
