import path from 'path';

export function isSubPathOf(parent: string, subPath: string) {
  const relativePath = path.relative(parent, subPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export const isJs = (extName: string): extName is '.js' | '.jsx' =>
  ['.js', '.jsx'].includes(extName);

export const isTs = (extName: string): extName is '.ts' | '.tsx' =>
  ['.ts', '.tsx'].includes(extName);
