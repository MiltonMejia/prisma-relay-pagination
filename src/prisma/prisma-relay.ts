import { PrismaClient } from "@prisma/client";
import { CursorList, CursorObject, Page, PrismaCursor, PrismaManyArgs, RelayPagination } from "./types";

export class PrismaPagination<T extends PrismaManyArgs> {
	private args: CursorObject<T> | null = null;
	private prisma: PrismaClient = null;
	private cursor: PrismaCursor = undefined;
	private page: Page = null;

	constructor(prisma: PrismaClient, args: CursorObject<T>) {
		this.prisma = prisma;
		this.args = args;
	}

	private async decryptCursor() {
		if (this.args!.cursor === null) return undefined;
		const decryptedCursor = Buffer.from(this.args!.cursor, "base64").toString("ascii").slice(9);
		const parseCursor = isNaN(parseInt(decryptedCursor)) ? decryptedCursor : parseInt(decryptedCursor);
		const model = await this.prisma[this.args!.model].findFirst({
			select: { id: true },
			cursor: { id: parseCursor },
		});

		return model !== null ? { id: model.id } : undefined;
	}

	async getPageEdges() {
		const edges = [];
		let select = undefined;

		if (this.args!.select !== "undefined") {
			select = { ...this.args!.select, id: true };
		}

		const data = await this.prisma[this.args!.model].findMany({
			cursor: this.cursor,
			take: this.args!.take,
			select: select,
			where: this.args!.where ?? undefined,
			orderBy: this.args!.orderBy ?? undefined,
		});

		for (let i = 0; i < data.length; i++) {
			edges.push({
				cursor: Buffer.from("saltysalt".concat(String(data[i].id))).toString("base64"),
				node: data[i],
			});
		}

		return edges;
	}

	async findPagination() {
		const [total, remain] = await this.prisma.$transaction([
			this.prisma[this.args!.model].count(),
			this.prisma[this.args!.model].count({
				cursor: this.cursor,
				where: this.args!.where ?? undefined,
				orderBy: this.args!.orderBy ?? undefined,
			}),
		]);

		const page = Math.ceil((total - remain) / this.args!.take);
		const fixedPage = page === 0 ? 1 : page + 1;
		return { total: total, remain: remain, currentPage: fixedPage };
	}

	generatePagination(currentPage: number, totalButtons: number, totalPages: number) {
		let firstPage = Math.floor(totalButtons / 2);
		let lastPage = Math.floor(totalButtons / 2);

		if (currentPage - firstPage <= 0) {
			lastPage += firstPage - currentPage + 1;
			firstPage = currentPage - 1;
		}

		if (currentPage + lastPage > totalPages) {
			firstPage += lastPage - (totalPages - currentPage);
			lastPage = totalPages - currentPage;
		}

		const pageList: number[] = [];
		for (let i = currentPage - firstPage; i <= currentPage + lastPage; i++) {
			pageList.push(i);
		}

		return pageList;
	}

	async getNearCursors() {
		const cursorList = [];
		const pagination = this.generatePagination(
			this.page!.currentPage,
			this.args!.buttons,
			Math.ceil(this.page!.total / this.args!.take)
		);

		for (let i = 0; i < pagination.length; i++) {
			const take = (pagination[i] - this.page!.currentPage) * this.args!.take;
			const skip = take === 0 ? 1 : take;

			if (pagination[i] === this.page!.currentPage) {
				cursorList.push({
					isCurrent: true,
					page: pagination[i],
					cursor: Buffer.from("saltysalt".concat(String(this.cursor?.id ?? 1))).toString("base64"),
				});
				continue;
			}
			const data = await this.prisma[this.args!.model].findFirst({
				cursor: this.cursor,
				select: { id: true },
				take: skip < 0 ? skip : 1,
				skip: skip > 0 ? skip : 1,
				where: this.args!.where ?? undefined,
				orderBy: this.args!.orderBy ?? undefined,
			});
			cursorList.push({
				isCurrent: take === 0,
				page: pagination[i],
				cursor: Buffer.from("saltysalt".concat(String(data.id))).toString("base64"),
			});
		}
		return cursorList;
	}

	async getAdjacentCursors(cursorList: CursorList) {
		const currentPage = cursorList!.findIndex((item) => item!.page === this.page!.currentPage);
		if (currentPage === -1) return { previous: null, next: null };

		return {
			previous: cursorList![currentPage - 1] ?? null,
			next: cursorList![currentPage + 1] ?? null,
		};
	}

	async getFirstRecord() {
		if (this.page!.currentPage === 1) {
			return null;
		}

		const data = await this.prisma[this.args!.model].findFirst({
			select: this.args!.select ?? undefined,
			where: this.args!.where ?? undefined,
			orderBy: this.args!.orderBy ?? undefined,
		});

		return {
			isCurrent: false,
			page: 1,
			cursor: Buffer.from("saltysalt".concat(String(data.id))).toString("base64"),
		};
	}

	async getLastRecord() {
		if (this.page!.remain === this.args!.take || this.page!.remain < this.args!.take) {
			return null;
		}

		const data = await this.prisma[this.args!.model].findFirst({
			take: -this.args!.take,
			select: this.args!.select ?? undefined,
			where: this.args!.where ?? undefined,
			orderBy: this.args!.orderBy ?? undefined,
		});

		return {
			isCurrent: false,
			page: Math.ceil(this.page!.total / this.args!.take),
			cursor: Buffer.from("saltysalt".concat(String(data.id))).toString("base64"),
		};
	}

	async create<M>(): Promise<RelayPagination<M>> {
		this.cursor = await this.decryptCursor();
		this.page = await this.findPagination();
		const cursorList = await this.getNearCursors();
		const nextToCursors = await this.getAdjacentCursors(cursorList);
		const firstCursor = await this.getFirstRecord();
		const lastCursor = await this.getLastRecord();
		const pageEdges = await this.getPageEdges();

		return {
			pageEdges: pageEdges,
			pageCursors: {
				...nextToCursors,
				first: firstCursor,
				last: lastCursor,
				around: cursorList,
			},
		};
	}
}
