import { ArgsType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CursorPaginationInput } from '../inputs';

@ArgsType()
export class ListArg {
	@IsOptional()
	@ValidateNested()
	@Type(() => CursorPaginationInput)
	@Field((type) => CursorPaginationInput, { nullable: true, description: 'Paginación del modelo' })
	pagination: CursorPaginationInput;
}
