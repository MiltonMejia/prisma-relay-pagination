/**
 * Development-only shim for the consumer-provided Prisma client alias.
 *
 * This package's public types import `Prisma` and `PrismaClient` from
 * `@libs/prisma-custom-relay-pagination/client`, which every consumer must map
 * to their own generated Prisma client through `tsconfig.json` compilerOptions
 * paths. This declaration lets the package itself type-check without that alias
 * (which only exists in the consumer's project).
 *
 * It is intentionally NOT published: `tsc` does not emit input `.d.ts` files,
 * so it never reaches `lib/`. Consumers always get their real generated types.
 */
declare module '@libs/prisma-custom-relay-pagination/client'
{
    export namespace Prisma
    {
        export type ModelName = string;

        export type TypeMap = {
            model: Record<ModelName, {
                operations: {
                    findMany: {
                        args: {
                            select?: unknown;
                            omit?: unknown;
                            include?: unknown;
                            where?: unknown;
                            orderBy?: unknown;
                        };
                    };
                };
            }>;
        };
    }

    // The implementation accesses `this.prisma[model].findMany/count/findFirst`
    // dynamically, so the consumer's real PrismaClient type is only needed at
    // call sites (through the alias). A loose type keeps this package building.
    export type PrismaClient = any;
}
