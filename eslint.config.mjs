import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default [
    { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'secrets/**', 'public/**'] },
    {
        files: ['src/**/*.ts', 'test/**/*.ts', 'integrations/n8n/**/*.ts', 'integrations/n8n/nodes/*.js'],
        languageOptions: { parser: tseslint.parser },
        plugins: { '@stylistic': stylistic },
        rules: {
            curly: ['error', 'all'],
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
            '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: false }],
            '@stylistic/padding-line-between-statements': ['error',
                { blankLine: 'always', prev: 'import', next: '*' },
                { blankLine: 'any', prev: 'import', next: 'import' },
                { blankLine: 'always', prev: '*', next: ['function', 'class', 'export'] },
                { blankLine: 'always', prev: ['function', 'class'], next: '*' }
            ],
            '@stylistic/max-statements-per-line': ['error', { max: 1 }]
        }
    }
]
