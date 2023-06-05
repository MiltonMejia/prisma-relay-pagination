import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({
	description: "Información de los nodos de la paginación",
})
export class PageEdgeItem {
	@Field((type) => String, { nullable: true, description: "Cursor del nodo" })
	cursor: string | undefined;
}
