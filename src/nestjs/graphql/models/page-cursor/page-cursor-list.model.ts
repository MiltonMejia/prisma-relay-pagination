import { Directive, Field, ObjectType } from "@nestjs/graphql";
import { PageCursorItem } from "./page-cursor-item.model";

@Directive("@shareable")
@ObjectType()
export class PageCursorList {
	@Field((type) => PageCursorItem, { nullable: true })
	first: PageCursorItem | undefined;

	@Field((type) => PageCursorItem, { nullable: true })
	previous: PageCursorItem | undefined;

	@Field((type) => [PageCursorItem], { nullable: true })
	around: PageCursorItem[] | undefined;

	@Field((type) => PageCursorItem, { nullable: true })
	next: PageCursorItem | undefined;

	@Field((type) => PageCursorItem, { nullable: true })
	last: PageCursorItem | undefined;
}
