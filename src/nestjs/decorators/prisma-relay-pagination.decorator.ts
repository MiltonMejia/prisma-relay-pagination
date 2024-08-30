import { addFieldMetadata, Int, TypeMetadataStorage } from '@nestjs/graphql';
import { ClassType } from '@nestjs/graphql/dist/enums/class-type.enum';
import { ClassMetadata } from '@nestjs/graphql/dist/schema-builder/metadata';
import { ObjectTypeMetadata } from '@nestjs/graphql/dist/schema-builder/metadata/object-type.metadata';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { addClassTypeMetadata } from '@nestjs/graphql/dist/utils/add-class-type-metadata.util';
import { GraphQLScalarType } from 'graphql/type/definition';
import { PageCursorList } from '../graphql/models/page-cursor/page-cursor-list.model';
import { PageEdgeItem } from '../graphql/models/page-edge/page-edge-item.model';

export type PrismaRelayPaginationObjectArgs = Omit<ClassMetadata, 'name' | 'target'> & { type: Function | GraphQLScalarType<unknown, unknown> };
export function PrismaRelayPagination(args: PrismaRelayPaginationObjectArgs) {
    return function (target: Function) {
        const { type, ...targetArgs } = args;
        const edgeObject = createPaginationEdgeObject(type);
        createPaginationObject({ ...targetArgs, target: target, modelName: type.name, edgeObject });
    };
}

function createPaginationEdgeObject(type: Function | GraphQLScalarType<unknown, unknown>) {
    const paginationEdge = class extends PageEdgeItem { };
    addFieldMetadata(() => type, { nullable: false }, paginationEdge.prototype, 'node');
    const pageEdgeMetadata: ObjectTypeMetadata = { name: `${type.name}Edge`, target: paginationEdge, description: `Prisma relay pagination edge of ${type.name} model` };

    const addEdgeMetadata = () => TypeMetadataStorage.addObjectTypeMetadata(pageEdgeMetadata);
    addEdgeMetadata();
    LazyMetadataStorage.store(addEdgeMetadata);
    addClassTypeMetadata(addEdgeMetadata, ClassType.OBJECT);

    return paginationEdge;
}

type ModelListObjectArgs = Omit<ClassMetadata, 'name'> & { edgeObject: typeof PageEdgeItem, modelName: string };
function createPaginationObject(args: ModelListObjectArgs) {
    const { target, edgeObject, modelName, ...targetArgs } = args;

    const storedObjectType = TypeMetadataStorage.getObjectTypesMetadata().find((item) => item.name === target.name);
    if (typeof storedObjectType !== 'undefined') {
        throw Error(`You can't define multiple object types with name: "${target.name}"`);
    }

    addFieldMetadata(() => Int, { nullable: false }, target.prototype, 'totalCount');
    addFieldMetadata(() => PageCursorList, { nullable: true }, target.prototype, 'pageCursors');
    addFieldMetadata(() => [edgeObject], { nullable: false }, target.prototype, 'pageEdges');

    const listMetadata: ObjectTypeMetadata = { name: target.name, target: target, description: `Prisma relay pagination of ${modelName} model`, ...targetArgs };
    const createListMetadata = () => TypeMetadataStorage.addObjectTypeMetadata(listMetadata);

    createListMetadata();
    LazyMetadataStorage.store(createListMetadata);
    addClassTypeMetadata(target, ClassType.OBJECT);
}