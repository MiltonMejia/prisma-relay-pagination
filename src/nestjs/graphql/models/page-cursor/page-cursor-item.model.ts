import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

@Directive('@shareable')
@ObjectType()
export class PageCursorItem {
	@Field(() => String)
	cursor!: string;

	@Field(() => Int)
	page!: number;

	@Field(() => Boolean)
	isCurrent!: boolean;
}
