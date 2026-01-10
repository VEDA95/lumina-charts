import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  prettierConfig,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.cjs', '**/*.mjs'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        Window: 'readonly',
        document: 'readonly',
        Document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        AddEventListenerOptions: 'readonly',
        WindowEventMap: 'readonly',
        DocumentEventMap: 'readonly',
        HTMLElementEventMap: 'readonly',
        CustomEvent: 'readonly',
        AbortController: 'readonly',
        EventTarget: 'readonly',
        EventListener: 'readonly',
        AbortSignal: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLImageElement: 'readonly',
        ImageData: 'readonly',
        WebGL2RenderingContext: 'readonly',
        WebGLBuffer: 'readonly',
        WebGLTexture: 'readonly',
        WebGLProgram: 'readonly',
        WebGLShader: 'readonly',
        WebGLFramebuffer: 'readonly',
        WebGLVertexArrayObject: 'readonly',
        WebGLUniformLocation: 'readonly',
        WebGLContextAttributes: 'readonly',
        GPUDevice: 'readonly',
        GPUCanvasContext: 'readonly',
        // Node globals
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        // TypedArrays
        Float32Array: 'readonly',
        Float64Array: 'readonly',
        Int8Array: 'readonly',
        Int16Array: 'readonly',
        Int32Array: 'readonly',
        Uint8Array: 'readonly',
        Uint16Array: 'readonly',
        Uint32Array: 'readonly',
        ArrayBuffer: 'readonly',
        ArrayBufferView: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      // TypeScript rules
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // General rules
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Prettier
      'prettier/prettier': 'error',
    },
  },
];
