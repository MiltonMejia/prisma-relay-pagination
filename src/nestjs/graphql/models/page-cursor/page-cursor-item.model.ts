import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

@Directive('@shareable')
@ObjectType()
export class PageCursorItem {
	@Field((type) => String)
	cursor!: string;

	@Field((type) => Int)
	page!: number;

	@Field((type) => Boolean)
	isCurrent!: boolean;
}
