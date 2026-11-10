import js from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.es2021,
                ...globals.node,
                ...globals.browser
            }
        },
        plugins: {
            jsdoc
        },
        rules: {
            'no-empty': [
                'error',
                {
                    allowEmptyCatch: true
                }
            ],
            'no-unused-vars': 'off',
            'indent': [
                'error',
                4,
                {
                    SwitchCase: 1
                }
            ],
            'linebreak-style': [
                'error',
                'unix'
            ],
            'quotes': 'off',
            'semi': [
                'error',
                'always'
            ]
        }
    }
];
