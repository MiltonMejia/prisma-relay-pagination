import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';
import { PageCursorList } from './page-cursor/page-cursor-list.model';

@Directive('@shareable')
@ObjectType()
export class CursorOffsetPagination {
	@Field(() => PageCursorList, { nullable: true, defaultValue: null })
	pageCursors: PageCursorList | null = null;

	@Field(() => Int)
	totalCount!: number;
}
