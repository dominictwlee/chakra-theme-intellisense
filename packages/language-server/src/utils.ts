import path from 'path';

export function isSubPathOf(parent: string, subPath: string) {
  const relativePath = path.relative(parent, subPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}
