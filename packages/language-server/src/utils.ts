import { promises as fsp } from 'fs';
import { URI } from 'vscode-uri';
import path from 'path';
import { WorkspaceFolder } from 'vscode-languageserver/node';

export function isSubPathOf(parent: string, subPath: string) {
  const relativePath = path.relative(parent, subPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export async function findChakraDependencyInWorkspaces(folders: WorkspaceFolder[]) {
  const folderPaths = folders.map((f) => {
    const uri = URI.parse(f.uri);
    return path.join(uri.fsPath, 'package.json');
  });
  const packageJsons = await Promise.all(folderPaths.map((p) => fsp.readFile(p, 'utf-8')));

  const hasChakraDependencyByUri = new Map<string, boolean>();

  packageJsons.forEach((json, index) => {
    const parsedPackageJson = JSON.parse(json);
    hasChakraDependencyByUri.set(
      folders[index].uri,
      !!parsedPackageJson.dependencies?.['@chakra-ui/react']
    );
  });

  return hasChakraDependencyByUri;
}
