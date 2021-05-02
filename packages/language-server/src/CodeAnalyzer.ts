import LRU from 'lru-cache';
import { URI, Utils } from 'vscode-uri';
import { transformSync } from 'esbuild';
import { parseSync } from '@babel/core';
import { isTs } from './utils';
import { File, ImportDeclaration, isFile, isImportDeclaration } from '@babel/types';

export interface SourceFileParams {
  uri: string;
  code: string;
  shouldInvalidate?: boolean;
}

export interface CodeAnalyzerParseResult {
  ast: File | null;
  hasChakraImport: boolean;
}

export default class CodeAnalyzer {
  private cache: LRU<string, File>;

  constructor() {
    this.cache = new LRU(100);
  }

  parse({ uri, code, shouldInvalidate }: SourceFileParams): CodeAnalyzerParseResult {
    if (this.cache.has(uri) && !shouldInvalidate) {
      return { ast: this.cache.get(uri) as File, hasChakraImport: true };
    }

    const parsedUri = URI.parse(uri);
    const extName = Utils.extname(parsedUri);
    const jsCode = isTs(extName) ? transformSync(code).code : code;
    const ast = parseSync(jsCode, {
      sourceType: 'module',
      presets: ['@babel/preset-typescript', '@babel/preset-react'],
    });

    if (!isFile(ast)) {
      return { ast: null, hasChakraImport: false };
    }

    const chakraImportDeclaration = ast.program.body.find(
      (node) => isImportDeclaration(node) && node.source.value === '@chakra-ui/react'
    ) as ImportDeclaration | undefined;

    if (!chakraImportDeclaration) {
      return { ast, hasChakraImport: false };
    }

    return { ast, hasChakraImport: true };
  }
}
