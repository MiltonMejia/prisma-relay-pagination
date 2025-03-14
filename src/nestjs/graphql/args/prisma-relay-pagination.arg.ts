import { ArgsType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CursorPaginationInput } from '../inputs';

@ArgsType()
export class PrismaRelayPaginationArg {

    @ValidateNested()
    @Type(() => CursorPaginationInput)
    @Field(() => CursorPaginationInput, { description: 'Model pagination' })
    pagination!: CursorPaginationInput;

}
