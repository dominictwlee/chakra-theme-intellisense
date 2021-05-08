import LRU from 'lru-cache';
import { promises as fsp } from 'fs';
import { URI, Utils } from 'vscode-uri';
import { parseSync, traverse } from '@babel/core';
import { FileEvent, Position } from 'vscode-languageserver/node';
import {
  File,
  ImportDeclaration,
  isFile,
  isIdentifier,
  isImportDeclaration,
  isImportSpecifier,
} from '@babel/types';

export interface SourceFileParams {
  uri: string;
  code: string;
  shouldInvalidate?: boolean;
}

export interface ImportSpecifierNames {
  name: string;
  localName: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetTypescript = require('@babel/preset-typescript');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetReact = require('@babel/preset-react');

export default class ChakraCodeAnalyzer {
  private cache: LRU<string, File>;

  constructor() {
    this.cache = new LRU(100);
  }

  parse({ uri, code, shouldInvalidate = false }: SourceFileParams): File | null {
    if (this.cache.has(uri) && !shouldInvalidate) {
      return this.cache.get(uri) as File;
    }

    const parsedUri = URI.parse(uri);
    const filename = Utils.basename(parsedUri);

    const ast = parseSync(code, {
      sourceType: 'module',
      filename,
      presets: [babelPresetTypescript, babelPresetReact],
    });

    if (!isFile(ast)) {
      return null;
    }

    const chakraImportDeclaration = ast.program.body.find(
      (node) => isImportDeclaration(node) && node.source.value === '@chakra-ui/react'
    ) as ImportDeclaration | undefined;

    if (!chakraImportDeclaration) {
      return null;
    }

    return ast;
  }

  traverse(ast: File) {
    const chakraImportMap = this.createChakraImportMap(ast);
    traverse(ast, {
      JSXOpeningElement(nodePath) {
        nodePath.stop();
      },
    });
  }

  createChakraImportMap(ast: File) {
    const chakraImportDeclaration = ast.program.body.find(
      (node) => isImportDeclaration(node) && node.source.value === '@chakra-ui/react'
    ) as ImportDeclaration;

    const chakraImports: Record<string, ImportSpecifierNames> = {};
    chakraImportDeclaration.specifiers.forEach((node) => {
      if (!isImportSpecifier(node) || !isIdentifier(node.imported) || !isIdentifier(node.local)) {
        return;
      }
      chakraImports[node.local.name] = {
        name: node.imported.name,
        localName: node.local.name,
      };
    });

    return chakraImports;
  }
}
