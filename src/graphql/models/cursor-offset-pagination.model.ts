import { Field, Int, ObjectType } from "@nestjs/graphql";
import { PageCursorList } from "./page-cursor/page-cursor-list.model";

@ObjectType({
	description: "Información de los cursores de la páginación",
})
export class CursorOffsetPagination {
	@Field((type) => PageCursorList, { nullable: true, description: "Información de las páginas adyacentes al actual" })
	pageCursors: PageCursorList | undefined;

	@Field((type) => Int, { description: "Registros totales de la paginación" })
	totalCount: number | undefined;
}
