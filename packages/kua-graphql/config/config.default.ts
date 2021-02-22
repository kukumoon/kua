import { GraphQLConfig } from '../app.js';

const underDevelopment =  process.env.NODE_ENV  === 'dev'
  || process.env.NODE_ENV  === 'development'
  || process.env.NODE_ENV  === 'test'
;

const graphQLConfig: GraphQLConfig = {
  router: '/graphql',
  graphiql: false,
  options: {
    debug: !underDevelopment,
    introspection: !underDevelopment,
    parseOptions: {
      noLocation: underDevelopment,
    },
  },
};

export default {
  middleware: ['graphql-pre', 'graphql'],
  graphql: graphQLConfig,
};
