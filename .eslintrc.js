module.exports = {
    root: true,
    env: {
        node: true,
    },
    parserOptions: {
        parser: 'babel-eslint',
    },
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-param-reassign': ['error', {
            props: true,
            ignorePropertyModificationsFor: [
                'ctx', // for koa ctx
                'acc', // for reduce accumulators
                'e', // for e.returnvalue
            ],
        }],
        'max-len': ['error', {
            code: 140,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
            ignoreTrailingComments: true,
        }],
    },
};
