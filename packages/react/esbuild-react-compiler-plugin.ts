import { readFileSync } from 'node:fs';
import * as babel from '@babel/core';
import BabelPluginReactCompiler from 'babel-plugin-react-compiler';
import type { Plugin, Loader } from 'esbuild';

interface ReactCompilerPluginOptions {
  filter?: RegExp;
  sourceMaps?: boolean;
}

/**
 * ESBuild plugin that integrates the React Compiler (babel-plugin-react-compiler)
 * Transforms React components with automatic memoization optimizations
 */
export function ReactCompilerEsbuildPlugin({
  filter = /\.tsx$/,
  sourceMaps = true,
}: ReactCompilerPluginOptions = {}): Plugin {
  return {
    name: 'esbuild-react-compiler-plugin',
    setup(build) {
      // Cache for incremental builds
      const buildCache = new Map<string, string>();
      let fileCount = 0;

      build.onEnd(() => {
        if (fileCount > 0) {
          console.log(`[React Compiler] Compiled ${fileCount} files`);
          fileCount = 0;
        }
      });

      build.onLoad({ filter, namespace: '' }, (args) => {
        const contents = readFileSync(args.path, 'utf8');

        // Check cache
        const cacheKey = `${args.path}:${contents}`;
        if (buildCache.has(cacheKey)) {
          return {
            contents: buildCache.get(cacheKey),
            loader: 'tsx' as Loader,
          };
        }

        // First, transform TSX to JS using esbuild's built-in transform
        const esbuildResult = build.esbuild.transformSync(contents, {
          loader: 'tsx' as Loader,
          jsx: 'automatic',
          target: build.initialOptions.target || 'es2022',
          define: build.initialOptions.define,
          format: 'esm',
        });

        // Then run through React Compiler via Babel
        try {
          const babelResult = babel.transformSync(esbuildResult.code, {
            plugins: [[BabelPluginReactCompiler, { target: '19' }]],
            filename: args.path,
            caller: {
              name: 'esbuild-react-compiler-plugin',
              supportsStaticESM: true,
            },
            sourceMaps: sourceMaps ? 'inline' : false,
          });

          const outputCode = babelResult?.code ?? esbuildResult.code;

          // Cache the result
          buildCache.set(cacheKey, outputCode);
          fileCount++;

          return {
            contents: outputCode,
            loader: 'js' as Loader,
          };
        } catch (error) {
          // If React Compiler fails, fall back to esbuild output
          console.warn(`[React Compiler] Warning: Failed to compile ${args.path}, using esbuild output`);
          return {
            contents: esbuildResult.code,
            loader: 'js' as Loader,
          };
        }
      });
    },
  };
}
