import 'reflect-metadata';
import { Field, ObjectType, TypeMetadataStorage } from '@nestjs/graphql';
import { PrismaRelayPagination } from '../prisma-relay-pagination.decorator.js';

@ObjectType()
class Foo {
	@Field(() => String)
	name!: string;
}

@ObjectType()
class Bar {
	@Field(() => String)
	name!: string;
}

const findObjectType = (name: string) =>
	TypeMetadataStorage.getObjectTypesMetadata().find((item) => item.name === name);

describe('PrismaRelayPagination', () => {
	it('resolves an edge object type when the model is passed directly', () => {
		@PrismaRelayPagination({ type: Foo })
		class FooListClass {}

		const edge = findObjectType('FooEdge');

		expect(typeof FooListClass).toBe('function');
		expect(edge).toBeDefined();
		expect(edge?.description).toContain('Foo');
		expect(edge?.name).toBe('FooEdge');
	});

	it('resolves an edge object type when the model is passed as a thunk', () => {
		@PrismaRelayPagination({ type: () => Bar })
		class BarListThunk {}

		const edge = findObjectType('BarEdge');

		expect(typeof BarListThunk).toBe('function');
		expect(edge).toBeDefined();
		expect(edge?.description).toContain('Bar');
		expect(edge?.name).toBe('BarEdge');
	});
});
