import { ApolloServer } from 'apollo-server-koa';
import GraphQLServerOptions from "apollo-server-core/dist/graphqlOptions";

export class KuaApolloServer extends ApolloServer {
    async graphQLServerOptions(
        integrationContextArgument?: Record<string, any>
    ): Promise<GraphQLServerOptions> {
        const graphQLServerOptions = await super.graphQLServerOptions(integrationContextArgument);
        // 支持formatError中传入Context
        if (graphQLServerOptions.formatError) {
            const formatError = graphQLServerOptions.formatError as any;
            (graphQLServerOptions.formatError as any) = err => {
                return formatError(err, graphQLServerOptions.context);
            };
        }
        return graphQLServerOptions;
    }

    createGraphQLServerOptions(ctx) {
        return this.graphQLServerOptions({ctx});
    }
}

export * from 'apollo-server-koa';
