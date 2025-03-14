import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaSelect } from '@paljs/plugins';
import omit from 'lodash/omit';

export type ResolverSelectInput = { isPagination?: boolean; omit?: string[]; model?: string };

export const ResolverSelect = createParamDecorator((
    data: ResolverSelectInput = { isPagination: false },
    context: ExecutionContext
) => {
    const ctx = GqlExecutionContext.create(context);
    const selectRaw = data?.model
        ? new PrismaSelect(ctx.getInfo()).valueWithFilter(data.model)
        : new PrismaSelect(ctx.getInfo()).value;
    const select = data.isPagination ? selectRaw.select.pageEdges.select.node.select : selectRaw.select;

    if (Object.keys(select).length === 0) return { id: true };
    if (typeof data?.omit !== 'undefined') return omit(select, data.omit ?? []);
    return select;
});
