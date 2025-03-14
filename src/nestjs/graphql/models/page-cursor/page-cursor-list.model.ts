import { Directive, Field, ObjectType } from "@nestjs/graphql";
import { PageCursorItem } from "./page-cursor-item.model";

@Directive("@shareable")
@ObjectType()
export class PageCursorList {
	@Field(() => PageCursorItem, { nullable: true, defaultValue: null })
	first: PageCursorItem | null = null

	@Field(() => PageCursorItem, { nullable: true, defaultValue: null })
	previous: PageCursorItem | null = null;

	@Field(() => [PageCursorItem], { nullable: true, defaultValue: null })
	around: PageCursorItem[] | null = null;

	@Field(() => PageCursorItem, { nullable: true, defaultValue: null })
	next: PageCursorItem | null = null

	@Field(() => PageCursorItem, { nullable: true, defaultValue: null })
	last: PageCursorItem | null = null
}
