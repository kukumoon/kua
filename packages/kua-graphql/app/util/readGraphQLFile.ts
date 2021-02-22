import fs from 'fs';
import glob from 'fast-glob';
import path from 'path';
import camelcase from 'camelcase';
import compatibleRequire from 'compatible-require';
import { IResolvers } from 'graphql-tools';
import { GraphQLConfig } from '../../app';

const supportedTypescript = Object.keys(require.extensions).includes('.ts');
const supportedExtensions = supportedTypescript ? ['js', 'ts'] : ['js'];

const GRAPHQL_FILE_PATTERNS = [
  '**/schema.(graphql|gql)',
  `**/resolver.(${supportedExtensions.join('|')})`,
  `**/connector.(${supportedExtensions.join('|')})`,
];

/**
 * 从GraphQL目录中找到Resolver，Connector和Schema定义文件
 * 并生成对应的resolver，connectorClass和typeDefs
 * @param {KuaGraphqlOptions} options
 * @param graphqlDir
 * @returns {Promise<{typeDefs: any[]; resolvers: Array<IResolvers>; connectorClasses: {}}>}
 */
export async function readGraphQLFileFromDir(
  options: GraphQLConfig,
  graphqlDir,
) {
  // eslint-disable-next-line no-undef
  const connectorClasses: { [key: string]: object } = {};
  const typeDefs: string[] = [];
  const resolvers: IResolvers[] = [];

  const files = await glob(GRAPHQL_FILE_PATTERNS, {
    cwd: path.resolve(graphqlDir),
    objectMode: true,
    absolute: true,
  });

  const resolverSet = new Set<string>();
  const connectorSet = new Set<string>();
  const schemaSet = new Set<string>();

  files.forEach((file) => {
    if (file.name.match('resolver')) {
      resolverSet.add(
        // 这里通过在set中保存不带后缀的文件来做文件的去重，防止同时引入ts和js文件
        path.resolve(path.dirname(file.path), file.name.split('.')[0]));
    }

    if (file.name.match('connector')) {
      connectorSet.add(
        // 这里通过在set中保存不带后缀的文件来做文件的去重，防止同时引入ts和js文件
        path.resolve(path.dirname(file.path), file.name.split('.')[0]));
    }

    if (file.name.match('schema')) {
      schemaSet.add(file.path);
    }
  });

  resolverSet.forEach((resolverPath) => {
    const resolversMap = compatibleRequire(resolverPath);
    resolvers.push(resolversMap);
  });

  connectorSet.forEach((connectorPath) => {
    const connectorClassName = path
      .relative(graphqlDir, path.resolve(connectorPath, '../'))
      .split(path.sep)
      .map(_ => camelcase(_))
      .join('.');
    connectorClasses[connectorClassName] = compatibleRequire(connectorPath);
  });

  schemaSet.forEach((schemaPath) => {
    typeDefs.push(fs.readFileSync(schemaPath, 'utf8'));
  });

  return { typeDefs, resolvers, connectorClasses };
}
