import { Directive, Field, ObjectType } from '@nestjs/graphql';

@Directive('@shareable')
@ObjectType()
export class PageEdgeItem {
	@Field(() => String, { nullable: true, defaultValue: null })
	cursor: string | null = null;
}
