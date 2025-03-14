import { ArgsType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CursorPaginationInput } from '../inputs';

@ArgsType()
export class PrismaRelayPaginationOptionalArg {

    @IsOptional()
    @ValidateNested()
    @Type(() => CursorPaginationInput)
    @Field(() => CursorPaginationInput, { nullable: true, defaultValue: undefined, description: 'Model pagination' })
    pagination?: CursorPaginationInput;

}
