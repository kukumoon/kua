export default app => ({
  // @ts-ignore
  get connector() {
    const ctx = this;
    if (!ctx.graphqlConnectorLazyLoader) {
      ctx.graphqlConnectorLazyLoader = {};

      const { connectorClasses } = app.graphql;
      Object.keys(connectorClasses).forEach((name) => {
        Object.defineProperty(
          ctx.graphqlConnectorLazyLoader,
          name,
          {
            configurable: true,
            enumerable: true,
            get() {
              ctx.graphqlCachedConnector = ctx.graphqlCachedConnector || {};
              if (!ctx.graphqlCachedConnector[name]) {
                ctx.graphqlCachedConnector[
                  name
                ] = new connectorClasses[name](ctx);
              }
              return ctx.graphqlCachedConnector[name];
            },
          },
        );
      });
    }
    return ctx.graphqlConnectorLazyLoader;
  },
});
