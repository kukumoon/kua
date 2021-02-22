import {
    ASTVisitor,
    concatAST,
    DocumentNode,
    Kind,
    ObjectTypeDefinitionNode,
    parse,
    ParseOptions,
    visit
} from 'graphql';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

interface MergeType {
    [key: string]: ObjectTypeDefinitionNode;
}

/**
 * 获取Query和Mutation的AST对象
 * @param {string} type
 * @returns {ObjectTypeDefinitionNode}
 */
function getQueryOrMutationAst(type: string): ObjectTypeDefinitionNode {
    return {
        kind: Kind.OBJECT_TYPE_DEFINITION,
        description: undefined,
        name: {
            kind: Kind.NAME,
            value: type,
            loc: undefined
        },
        interfaces: [],
        directives: [],
        fields: [],
        loc: undefined
    };
}

/**
 * 合并mergeTypes，并返回DocumentNode的AST对象
 * @param mergeTypes
 * @returns {DocumentNode}
 */
function transformMergeTypesToDocument(mergeTypes: MergeType): DocumentNode {
    const documentNode = {
        kind: 'Document',
        definitions: []
    };

    for (const key of Object.keys(mergeTypes)) {
        const type = mergeTypes[key];
        if (type.fields.length > 0) {
            documentNode.definitions.push(type);
        }
    }
    return documentNode as DocumentNode;
}

/**
 * 将两个ObjectType进行合并
 * @param {Mutable<ObjectTypeDefinitionNode>} type
 * @param {ObjectTypeDefinitionNode} node
 */
function mergeTypeDefinition(
    type: Mutable<ObjectTypeDefinitionNode>,
    node: ObjectTypeDefinitionNode
): void {
    type.fields = type.fields.concat(node.fields);
    type.directives = type.directives.concat(node.directives);
    type.interfaces = type.interfaces.concat(node.interfaces);
}

/**
 * 将typeDefs字符串合并并解析成DocumentNode的AST对象
 * @param {string[]} typeDefs
 * @param {ParseOptions} options
 * @returns {DocumentNode}
 */
export function mergeTypeDefs(
    typeDefs: string[],
    options?: ParseOptions
): DocumentNode {
    const mergeTypes = {
        Query: getQueryOrMutationAst('Query'),
        Mutation: getQueryOrMutationAst('Mutation')
    };
    // Location会在生成注释的时候用到
    const originAsts = typeDefs
        .filter(typeDef => typeDef.trim() !== '')
        .map(typeDef => parse(typeDef, { ...options }));
    const astVisitor: ASTVisitor = {
        ObjectTypeDefinition: {
            enter(node) {
                const mergeOperations = ['Query', 'Mutation'];
                if (mergeOperations.includes(node.name.value)) {
                    const type = mergeOperations.find(
                        operation => operation === node.name.value
                    );
                    mergeTypeDefinition(mergeTypes[type], node);
                    return null;
                }
                return undefined;
            }
        }
    };
    const astsWithoutQueryAndMutation: DocumentNode[] = [];
    for (const ast of originAsts) {
        astsWithoutQueryAndMutation.push(visit(ast, astVisitor));
    }
    return concatAST(
        astsWithoutQueryAndMutation.concat(
            transformMergeTypesToDocument(mergeTypes)
        )
    );
}
