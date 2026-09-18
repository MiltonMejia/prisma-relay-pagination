import { addFieldMetadata, Int, ObjectType, TypeMetadataStorage, type ObjectTypeOptions } from '@nestjs/graphql';
import { GraphQLScalarType } from 'graphql';
import { PageCursorList } from '../graphql/models/page-cursor/page-cursor-list.model.js';
import { PageEdgeItem } from '../graphql/models/page-edge/page-edge-item.model.js';

export type PrismaRelayPaginationModelType = Function | GraphQLScalarType<unknown, unknown>;

export type PrismaRelayPaginationType = PrismaRelayPaginationModelType | (() => PrismaRelayPaginationModelType);

export type PrismaRelayPaginationObjectArgs = ObjectTypeOptions & { type: PrismaRelayPaginationType };

export function PrismaRelayPagination(args: PrismaRelayPaginationObjectArgs) {
    return function (target: Function) {
        const { type, ...options } = args;
        const resolveType = createTypeResolver(type);
        const edgeObject = createPaginationEdgeObject(resolveType);
        createPaginationObject({ target, modelName: resolveType().name, edgeObject, options });
    };
}

/**
 * Accepts both a class/scalar directly and a thunk (`() => Model`).
 *
 * The thunk form is required by ESM consumers: `{ type: Model }` evaluates the
 * model binding eagerly at decorator call time, which throws a temporal dead
 * zone error when the model participates in a circular import (list model
 * importing the model that imports the list model).
 */
function createTypeResolver(type: PrismaRelayPaginationType): () => PrismaRelayPaginationModelType {
    if (typeof type === 'function' && typeof type.prototype === 'undefined') {
        return type as () => PrismaRelayPaginationModelType;
    }

    return () => type as PrismaRelayPaginationModelType;
}

function createPaginationEdgeObject(resolveType: () => PrismaRelayPaginationModelType) {
    const paginationEdge = class extends PageEdgeItem { };
    const type = resolveType();
    addFieldMetadata(() => resolveType(), { nullable: false }, paginationEdge.prototype, 'node');
    ObjectType(`${type.name}Edge`, { description: `Prisma relay pagination edge of ${type.name} model` })(paginationEdge);

    return paginationEdge;
}

type ModelListObjectArgs = {
    target: Function;
    edgeObject: typeof PageEdgeItem;
    modelName: string;
    options: ObjectTypeOptions;
};

function createPaginationObject({ target, edgeObject, modelName, options }: ModelListObjectArgs) {
    const storedObjectType = TypeMetadataStorage.getObjectTypesMetadata().find((item) => item.name === target.name);
    if (typeof storedObjectType !== 'undefined') {
        throw Error(`You can't define multiple object types with name: "${target.name}"`);
    }

    addFieldMetadata(() => Int, { nullable: false }, target.prototype, 'totalCount');
    addFieldMetadata(() => PageCursorList, { nullable: true }, target.prototype, 'pageCursors');
    addFieldMetadata(() => [edgeObject], { nullable: false }, target.prototype, 'pageEdges');

    ObjectType(target.name, { description: `Prisma relay pagination of ${modelName} model`, ...options })(target);
}
