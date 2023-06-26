import { Directive, Field, ObjectType } from '@nestjs/graphql';

@Directive('@shareable')
@ObjectType()
export class PageEdgeItem {
	@Field((type) => String, { nullable: true })
	cursor: string | undefined;
}
