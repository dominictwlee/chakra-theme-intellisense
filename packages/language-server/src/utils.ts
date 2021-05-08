import path from 'path';
import { OpenMode, promises as fsp } from 'fs';
import { URI, Utils } from 'vscode-uri';
import { Position } from 'vscode-languageserver/node';
import { Node } from '@babel/types';

export function isSubPathOf(parent: string, subPath: string) {
  const relativePath = path.relative(parent, subPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export const isJs = (extName: string): extName is '.js' | '.jsx' =>
  ['.js', '.jsx'].includes(extName);

export const isTs = (extName: string): extName is '.ts' | '.tsx' =>
  ['.ts', '.tsx'].includes(extName);

interface MappedPromiseSettledResults<T> {
  successes: PromiseFulfilledResult<T>[];
  errors: PromiseRejectedResult[];
}
type Unwrap<T> = T extends Promise<infer U>
  ? U
  : T extends (...args: unknown[]) => Promise<infer U>
  ? U
  : T extends (...args: unknown[]) => infer U
  ? U
  : T;
export async function readUriFiles(
  uris: string[],
  options: { encoding: BufferEncoding; flag?: OpenMode } | BufferEncoding
) {
  const promises = uris.map((uri) => fsp.readFile(URI.parse(uri).fsPath, options));
  const results = await Promise.allSettled(promises);
  const mappedResults: MappedPromiseSettledResults<Unwrap<typeof promises[0]>> = {
    successes: [],
    errors: [],
  };

  for (const res of results) {
    if (res.status === 'fulfilled') {
      mappedResults.successes.push(res);
    } else {
      mappedResults.errors.push(res);
    }
  }

  return mappedResults;
}

export function mapPositionToLoc({ line, character }: Position) {
  return { line: line + 1, column: character };
}

export interface Loc {
  line: number;
  column: number;
}
export function isWithinNodeLocRange({ line, column }: Loc, node: Node) {
  if (!node.loc) {
    return false;
  }

  const {
    loc: { start, end },
  } = node;
  const isInLineRange = line >= start.line && line <= end.line;
  const isInColumnRange = column >= start.column && column <= end.column;
  if (isInLineRange && isInColumnRange) {
    return true;
  }

  return false;
}
