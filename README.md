# Prisma Relay Pagination

Inspired by [Prisma Korea's prisma-offset-pagination](https://github.com/prisma-korea/prisma-offset-pagination), Prisma Relay Pagination enhance pagination using Prisma cursor option.

If you want to know how to Prisma support pagination, see [Prisma documentation](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)

- [Installation](#installation)
- [How to use](#how-to-use)
    - [Parameters](#parameters)
    - [Notes](#notes)
    - [Example](#return-data-example)
- [Nestjs](#nestjs)
    - [ResolverSelect](#resolverselect)
        - [How to use](#how-to-use-1)
        - [Parameters](#parameters-1)
    - [PrismaRelayPagination](#prismarelaypagination)
        - [How to use](#how-to-use-2)
        - [Parameters](#parameters-2)
    - [PrismaRelayPagination](#prismarelaypaginationarg--prismarelaypaginationoptionalarg)
    - [How to use](#how-to-use-3)

## Installation

### NPM

```
npm install prisma-custom-relay-pagination
```

### Yarn

```
yarn add prisma-custom-relay-pagination
```

## How to use

```typescript
import { PrismaRelay } from 'prisma-custom-relay-pagination';

...
const result = new PrismaRelay(PrismaClient, {
    model: 'User',
    buttons: 5,
    where:{ id: 1 }
    omit: { id: true },
    orderBy: { id: 'asc' },
    select: { id: true },
    include: { createdBy: true },
    pagination: { items: 10, cursor: 'ABCD...' }
});
```

### Parameters

`prisma:` \
Prisma client object

`args:`

- `model` \
    Model name 
    (Typescript intellisense enabled from your available Prisma's models)

- `buttons` (optional) \
    Number of available pagination pages (Default value: 5 )

- `where` (optional) \
    Same values as Prisma.${Model}WhereInput

- `omit` (optional) \
    Same values as Prisma.{Model}Omit

- `orderBy` (optional) \
    Same values as Prisma.{Model}OrderByWithRelationInput

- `select` (optional) \
    Same values as Prisma.{Model}Select

- `include` (optional) \
    Same values as Prisma.{Model}Include

- `pagination` (optional) \
    If pagination is not added, all results will be returned

    * `cursor` (optional) \
        If cursor is not added, first page will be returned

    * `items` \
        Number of results returned

#### Notes

Intellisense in fields: `where`, `omit`, `orderBy`, `select` and `include` are available when model parameter is added.

### Return data example

```typescript
{
    pageEdges: [ 
        {  cursor: 'c2FsdHl256x0MQ==', node: { id: 1 } },
        {  cursor: 'c2FsdH4gw2x0MQ==', node: { id: 2 } },
        {  cursor: 'c2FsdHldwfx0MQ==', node: { id: 3 } } 
    ],
    pageCursors: {
        previous: null,
        next: { isCurrent: false, page: 2, cursor: 'c2FsdHldwfx0MQ==' },
        first: null,
        last: { isCurrent: false, page: 15, cursor: 'c2FsdHlz45x0MjExNTY=' },
        around: [
            { isCurrent: true, page: 1, cursor: 'c2FsdHl256x0MQ==' },
            { isCurrent: false, page: 2, cursor: 'c2FsdHldwfx0MQ==' },
            { isCurrent: false, page: 3, cursor: 'c2Fs75lzYWx0Mw==' }
        ]
    },
    totalCount: 45
}
```

## NestJS

There are some utilities for NestJS that help you to reduce boilerplate when you are using Graphql:

### ResolverSelect

Using [Pal.js](https://paljs.com/), this decorator converts Query fields from Graphql to Prisma select fields. You can check Pal.js [documentation](https://paljs.com/plugins/select/#example-query) to see how it works.

#### How to use

```typescript
import { ResolverSelect } from 'prisma-custom-relay-pagination';

@Resolver(() => User)
export class UserResolver {
    @Query(() => User)
    getUser(@ResolverSelect() select: Prisma.UserSelect) {
        ///Your code
    }
}
```

#### Parameters
`isPagination` (optional) \
Set parameter to `true` if you are using PrismaRelay (Default value: false)

`omit` (optional) \
Omit fields not declared in Prisma's schema or fields with their resolver defined in Graphql.

`model` (optional) \
GraphQL model name if it does not match with the Prisma schema model name
___

### PrismaRelayPagination
This decorator converts Graphql model to PrismaRelay pagination model

#### How to use

```typescript
import { PrismaRelayPagination } from 'prisma-custom-relay-pagination';

@PrismaRelayPagination({ type: User })
export class UserPagination {}
```

#### Graphql result example

```graphql
getUserPagination(...parameters) {
    totalCount
    pageCursors {
        first {
            cursor
            page
        }
        previous {
            cursor
            page
        }
        around {
            cursor
            page
        }
        next {
            cursor
            page
        }
        last {
            cursor
            page
        }
    }
    pageEdges {
        cursor
        node {
            ///User fields
        }
    }
}
```
#### Parameters
`type` \
Selected Graphql model to convert to pagination
___

## PrismaRelayPaginationArg / PrismaRelayPaginationOptionalArg
These classes help you add pagination parameters when you are using pagination queries. You can extend them if it's necessary with other fields like `where`, `orderBy`, etc.

If you want to force pagination, then use `PrismaRelayPaginationArg`, otherwise, use `PrismaRelayPaginationOptionalArg`

#### How to use

```typescript
import { PrismaRelayPaginationArg } from 'prisma-custom-relay-pagination';

@ArgsType()
export class UserPaginationArgs extends PrismaRelayPaginationArg {}
```