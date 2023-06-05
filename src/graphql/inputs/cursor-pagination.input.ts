import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, Length, Max, Min } from "class-validator";

@InputType({
	description: "Información de la paginación del modelo existente",
})
export class CursorPaginationInput {
	@Field({ nullable: true, description: "Cursor de la página" })
	@IsOptional()
	@Length(0, 255, {
		message:
			"Verifique que el número de letras en el campo: $property conste entre $constraint1 y $constraint2 letras",
	})
	cursor: string | null | undefined;

	@Field((type) => Int, { description: "Cantidad de registros que aparecen en la paginación" })
	@Min(1, { message: "Verifique que la propiedad: $property tenga un valor mínimo de 1" })
	@Max(500, { message: "Verifique que la propiedad: $property tenga un valor máximo de 100" })
	@IsInt({ message: "Verifique que la propiedad: $property sea de tipo Integer" })
	items!: number;
}
