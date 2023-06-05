import { Directive, Field, Int, ObjectType } from "@nestjs/graphql";

@Directive("@shareable")
@ObjectType({
	description: "Información de los cursores de la páginación",
})
export class PageCursorItem {
	@Field((type) => String, { description: "Cursor del nodo" })
	cursor!: string;

	@Field((type) => Int, { description: "Página actual de la paginación" })
	page!: number;

	@Field((type) => Boolean, { description: "Indica si el cursor corresponde a la página actual" })
	isCurrent!: boolean;
}
