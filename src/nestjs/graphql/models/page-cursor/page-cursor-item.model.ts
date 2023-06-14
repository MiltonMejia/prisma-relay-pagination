import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PageCursorItem {
	@Field((type) => String)
	cursor!: string;

	@Field((type) => Int)
	page!: number;

	@Field((type) => Boolean)
	isCurrent!: boolean;
}
