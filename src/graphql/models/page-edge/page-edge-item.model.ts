import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PageEdgeItem {
	@Field((type) => String, { nullable: true })
	cursor: string | undefined;
}
