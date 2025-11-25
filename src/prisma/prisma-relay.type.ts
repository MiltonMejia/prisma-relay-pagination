//@ts-expect-error
import { Prisma } from '@libs/prisma-custom-relay-pagination/client';

export type PrismaCursor = { id: number } | null;
export type Page = { total: number; remain: number; currentPage: number } | null;
export type CursorList = Cursor[] | null;
//@ts-ignore
type PrismaFindMany<T extends Prisma.ModelName> = Prisma.TypeMap['model'][T]['operations']['findMany']['args'];
//@ts-ignore
type PrismaFieldSelect<T extends Prisma.ModelName> = { select?: PrismaFindMany<T>['select'], omit?: never, include?: never };
//@ts-ignore
type PrismaFieldOmit<T extends Prisma.ModelName> = { select?: never, omit?: PrismaFindMany<T>['omit'], include?: PrismaFindMany<T>['include'] };
//@ts-ignore
export type CursorObject<T extends Prisma.ModelName> = {
    model: T,
    buttons?: number,
    where?: PrismaFindMany<T>['where'],
    orderBy?: PrismaFindMany<T>['orderBy'],
    pagination?: { items: number, cursor?: string }
} & (PrismaFieldSelect<T> | PrismaFieldOmit<T>);

export type PageEdge<T> = { cursor: string; node: T };
export type Cursor = { cursor: string; page: number; isCurrent: boolean } | null;
export type PageCursor = { first: Cursor, previous: Cursor, around: CursorList, next: Cursor, last: Cursor } | null;

export type RelayPagination<T> = {
    pageEdges: PageEdge<T>[],
    pageCursors: PageCursor,
    totalCount: number
};