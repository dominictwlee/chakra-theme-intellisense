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
import { isWithinNodeLocRange, Loc } from './utils';

export interface SourceFileParams {
  uri: string;
  code: string;
  shouldInvalidate?: boolean;
}

export interface ImportSpecifierNames {
  name: string;
  localName: string;
}

export interface ParsedResult {
  ast: File;
  importMap: Record<string, ImportSpecifierNames>;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetTypescript = require('@babel/preset-typescript');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetReact = require('@babel/preset-react');

export default class ChakraCodeAnalyzer {
  private astCache: LRU<string, ParsedResult>;

  constructor() {
    this.astCache = new LRU(100);
  }

  parse({ uri, code, shouldInvalidate = false }: SourceFileParams): ParsedResult | null {
    if (this.astCache.has(uri) && !shouldInvalidate) {
      return this.astCache.get(uri) as ParsedResult;
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

    const chakraImportMap = this.createChakraImportMap(chakraImportDeclaration);
    const parsedResult = { ast, importMap: chakraImportMap };
    this.astCache.set(uri, parsedResult);

    return parsedResult;
  }

  findChakraProps(parsedResult: ParsedResult, currentLoc: Loc) {
    const { ast, importMap } = parsedResult;
    traverse(ast, {
      JSXOpeningElement(nodePath) {
        if (!isWithinNodeLocRange(currentLoc, nodePath.node)) {
          return;
        }
      },
    });
  }

  createChakraImportMap(importDeclaration: ImportDeclaration) {
    const chakraImports: Record<string, ImportSpecifierNames> = {};
    importDeclaration.specifiers.forEach((node) => {
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
