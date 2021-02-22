export default () => async (ctx, next) => {
  await next();
  if (ctx.req.graphqlMetrics) {
    ctx.handleMethod = ctx.req.graphqlMetrics;
  }
};
