import { addFieldMetadata, Int, ObjectType, TypeMetadataStorage, type ObjectTypeOptions } from '@nestjs/graphql';
import { GraphQLScalarType } from 'graphql';
import { PageCursorList } from '../graphql/models/page-cursor/page-cursor-list.model.js';
import { PageEdgeItem } from '../graphql/models/page-edge/page-edge-item.model.js';

export type PrismaRelayPaginationObjectArgs = ObjectTypeOptions & { type: Function | GraphQLScalarType<unknown, unknown> };

export function PrismaRelayPagination(args: PrismaRelayPaginationObjectArgs) {
    return function (target: Function) {
        const { type, ...options } = args;
        const edgeObject = createPaginationEdgeObject(type);
        createPaginationObject({ target, modelName: type.name, edgeObject, options });
    };
}

function createPaginationEdgeObject(type: Function | GraphQLScalarType<unknown, unknown>) {
    const paginationEdge = class extends PageEdgeItem { };
    addFieldMetadata(() => type, { nullable: false }, paginationEdge.prototype, 'node');
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
