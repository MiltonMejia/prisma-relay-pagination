import { Directive, Field, ObjectType } from "@nestjs/graphql";
import { PageCursorItem } from "./page-cursor-item.model";

@Directive("@shareable")
@ObjectType({
	description: "Información de los nodos de la paginación",
})
export class PageCursorList {
	@Field((type) => PageCursorItem, { nullable: true, description: "Cursor del nodo" })
	first: PageCursorItem | undefined;

	@Field((type) => PageCursorItem, { nullable: true, description: "Cursor del nodo" })
	previous: PageCursorItem | undefined;

	@Field((type) => [PageCursorItem], { nullable: true, description: "Cursor del nodo" })
	around: PageCursorItem[] | undefined;

	@Field((type) => PageCursorItem, { nullable: true, description: "Cursor del nodo" })
	next: PageCursorItem | undefined;

	@Field((type) => PageCursorItem, { nullable: true, description: "Cursor del nodo" })
	last: PageCursorItem | undefined;
}
