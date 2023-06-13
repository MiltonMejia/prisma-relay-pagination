import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PageCursorList } from './page-cursor/page-cursor-list.model';

@ObjectType()
export class CursorOffsetPagination {
	@Field((type) => PageCursorList, { nullable: true })
	pageCursors: PageCursorList | undefined;

	@Field((type) => Int)
	totalCount: number | undefined;
}
