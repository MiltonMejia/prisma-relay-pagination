import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, Length, Max, Min } from "class-validator";

export const MAX_PAGINATION_ITEMS = 1000;

@InputType()
export class CursorPaginationInput {

    @Field({ nullable: true, defaultValue: undefined })
    @IsOptional()
    @Length(0, 255, {
        message: "Check that $property has between $constraint1 and $constraint2 letters",
    })
    cursor?: string;

    @Field(() => Int)
    @Min(1, { message: "Check that $property has a minimum 1 item" })
    @Max(MAX_PAGINATION_ITEMS, { message: `Check that $property has a maximum of $constraint1 items` })
    @IsInt({ message: "Check that $property is Integer" })
    items!: number;
}
