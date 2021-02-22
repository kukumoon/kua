import { ApolloServer } from 'apollo-server-koa';

export default (_, app) => {
  const options = app.config.graphql;
  const { middlewareOptions } = options;
  const { apolloServer }: { apolloServer: ApolloServer } = app.graphql;

  return apolloServer.getMiddleware({
    ...middlewareOptions,
    path: options.router,
  });
};
