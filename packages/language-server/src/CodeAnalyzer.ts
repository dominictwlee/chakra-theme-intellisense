import LRU from 'lru-cache';
import { URI, Utils } from 'vscode-uri';
import { ESTree, parse } from 'meriyah';
import { transformSync } from 'esbuild';
import { isTs } from './utils';

export interface SourceFileParams {
  uri: string;
  code: string;
  shouldInvalidate?: boolean;
}

export default class CodeAnalyzer {
  private cache: LRU<string, ESTree.Program>;

  constructor() {
    this.cache = new LRU(100);
  }

  parse({ uri, code, shouldInvalidate }: SourceFileParams) {
    if (this.cache.has(uri) && !shouldInvalidate) {
      return this.cache.get(uri);
    }

    const parsedUri = URI.parse(uri);
    const extName = Utils.extname(parsedUri);
    const jsCode = isTs(extName) ? transformSync(code).code : code;
    const ast = parse(jsCode, { jsx: true, module: true });

    this.cache.set(uri, ast);

    return ast;
  }
}
