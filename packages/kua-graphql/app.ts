import {
    Context,
    GraphQLRequest,
    GraphQLResponse,
} from 'apollo-server-core';
import path from 'path';
import {
    GraphQLError,
    GraphQLFormattedError
} from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { Config, KuaApolloServer, IMocks } from './app/util/kuaApolloServer';
import { mergeTypeDefs } from './app/util/mergeTypeDef';
import { readGraphQLFileFromDir } from './app/util/readGraphQLFile';
import { GetMiddlewareOptions } from 'apollo-server-koa/dist/ApolloServer.js';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type KuaApolloConfig = Omit<Omit<Config, 'mocks'>, 'formatError'> & {
    formatError?: (error: GraphQLError, ctx: Context) => GraphQLFormattedError;
};

export interface GraphQLConfig<KuaContext = any> {
    /**
     * GraphQL路由
     */
    router?: string;
    /**
     * 是否开启GraphIQL(playGround)
     */
    graphiql?: boolean;
    /**
     * 在每个请求前执行
     * @param {KuaContext} ctx
     * @param {GraphQLRequest} request
     */
    before?: (ctx: KuaContext, request: GraphQLRequest) => void;
    /**
     * 在每个请求后执行
     * @param {KuaContext} ctx
     * @param {GraphQLResponse} response
     */
    after?: (ctx: KuaContext, response: GraphQLResponse) => void;
    /**
     * 开启mock或传入mock配置
     */
    mocks?: boolean | IMocks;
    /**
     * GraphQL的目录
     */
    graphqlDir?: string | string[];
    /**
     * ApolloServer的配置
     */
    options?: KuaApolloConfig;
    /**
     * apollo-server-koa的中间件配置
     */
    middlewareOptions?: Omit<GetMiddlewareOptions, 'path'>;
}

export default async app => {
    const options: GraphQLConfig = app.config.graphql;
    const graphqlDir = options.graphqlDir
        ? Array.isArray(options.graphqlDir)
            ? options.graphqlDir
            : [options.graphqlDir]
        : [path.resolve(app.root, 'app', 'graphql')];

    const graphql = { typedefs: [], resolvers: [], connectorClasses: {} };

    for (const dir of graphqlDir) {
        const {
            typeDefs,
            resolvers,
            connectorClasses
        } = await readGraphQLFileFromDir(options, dir);
        graphql.typedefs = graphql.typedefs.concat(typeDefs);
        graphql.resolvers = graphql.resolvers.concat(resolvers);
        Object.assign(graphql.connectorClasses, connectorClasses);
    }

    const { options: apolloOptions = {}, mocks, graphiql } = options;
    const {
        schemaDirectives,
        parseOptions,
        playground,
        uploads
    } = apolloOptions;

    const resolvers = {
        JSON: GraphQLJSON,
        JSONObject: GraphQLJSONObject,
    };

    const schema = makeExecutableSchema({
        schemaDirectives,
        parseOptions,
        typeDefs: mergeTypeDefs(graphql.typedefs, parseOptions),
        resolvers,
    });

    const apolloServer = new KuaApolloServer({
        ...(apolloOptions as any),
        schema,
        mocks,
        introspection: true,
        context: async ({ ctx }) => {
            return ctx;
        },
        uploads: uploads || false,
        playground: graphiql && playground ? playground : graphiql
    });

    app.graphql = {
        apolloServer,
        connectorClasses: graphql.connectorClasses
    };
};
