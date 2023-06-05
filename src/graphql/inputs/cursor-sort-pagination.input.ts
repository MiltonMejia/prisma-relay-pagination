import { Field, InputType } from "@nestjs/graphql";
import { PaginationSortEnum } from "../../enums/pagination-sort.enum";

@InputType({
	description: "Forma de distribución de los registros",
})
export class CursorPaginationSortInput {
	@Field((type) => PaginationSortEnum, { description: "Tipo de orden de la paginación" })
	sort: PaginationSortEnum | undefined;
}
