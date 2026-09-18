import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { createRequire } from 'node:module';
import lodash from 'lodash';

const require = createRequire(import.meta.url);
const { omit } = lodash;

type PrismaSelectConstructor = typeof import('@paljs/plugins').PrismaSelect;

let PrismaSelectCtor: PrismaSelectConstructor | undefined;

function getPrismaSelect(): PrismaSelectConstructor
{
    if (typeof PrismaSelectCtor !== 'undefined')
    {
        return PrismaSelectCtor;
    }

    try
    {
        const loaded = require('@paljs/plugins').PrismaSelect as PrismaSelectConstructor;
        PrismaSelectCtor = loaded;

        return loaded;
    }
    catch
    {
        throw new Error('ResolverSelect requires the optional peer dependency "@paljs/plugins". Install it with: npm install @paljs/plugins');
    }
}

export type ResolverSelectInput = { isPagination?: boolean; omit?: string[]; model?: string };

export function buildResolverSelect(rawSelect: any, data: ResolverSelectInput = {}): Record<string, any>
{
    const baseSelect = rawSelect?.select ?? {};
    const select = data.isPagination
        ? baseSelect?.pageEdges?.select?.node?.select ?? {}
        : baseSelect;

    if (Object.keys(select).length === 0) return { id: true };
    if (typeof data.omit !== 'undefined') return omit(select, data.omit ?? []);
    return select;
}

export const ResolverSelect = createParamDecorator((
    data: ResolverSelectInput = { isPagination: false },
    context: ExecutionContext
) => {
    const PrismaSelect = getPrismaSelect();
    const ctx = GqlExecutionContext.create(context);
    const selectRaw = data?.model
        ? new PrismaSelect(ctx.getInfo()).valueWithFilter(data.model)
        : new PrismaSelect(ctx.getInfo()).value;

    return buildResolverSelect(selectRaw, data);
});
