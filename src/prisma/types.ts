import { Prisma } from "@prisma/client";

export type PrismaCursor = { id: number } | undefined;
export type Page = { total: number; remain: number; currentPage: number } | null;
export type CursorList = Cursor[] | null;

export type PrismaManyArgs = {
	select?: any;
	where?: any;
	orderBy?: any;
};

export type CursorObject<T extends PrismaManyArgs> = {
	take: number;
	buttons: number;
	cursor: string | null;
	select?: T["select"];
	//@ts-ignore
	model: Prisma.ModelName;
	where?: T["where"];
	orderBy?: T["orderBy"];
};

export type PageEdge<T> = { cursor: string; node: T };
export type Cursor = { cursor: string; page: number; isCurrent: boolean } | null;

export type RelayPagination<T> = {
	pageEdges: PageEdge<T>[];
	pageCursors: {
		first: Cursor;
		previous: Cursor;
		around: CursorList;
		next: Cursor;
		last: Cursor;
	};
	totalCount: number;
};
