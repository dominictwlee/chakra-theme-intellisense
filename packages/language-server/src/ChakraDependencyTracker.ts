import { promises as fsp } from 'fs';
import { URI, Utils } from 'vscode-uri';
import { FileEvent, WorkspaceFolder } from 'vscode-languageserver/node';
import { isSubPathOf } from './utils';

export default class ChakraDependencyTracker {
  uriToHasChakra: Map<string, boolean>;

  constructor() {
    this.uriToHasChakra = new Map();
  }

  async setInitialHasChakraStates(folders: WorkspaceFolder[]) {
    const packageJsons = await Promise.allSettled(
      folders.map((f) => {
        const path = Utils.resolvePath(URI.parse(f.uri), 'package.json').fsPath;
        return fsp.readFile(path, 'utf-8');
      })
    );

    packageJsons.forEach((readFileResult, index) => {
      if (readFileResult.status === 'fulfilled') {
        const parsedPackageJson = JSON.parse(readFileResult.value);
        this.uriToHasChakra.set(
          folders[index].uri,
          !!parsedPackageJson.dependencies?.['@chakra-ui/react']
        );
      }
    });
  }

  async updateHasChakraStatesFromFileChanges(changes: FileEvent[]) {
    const packageJsons = await Promise.allSettled(
      changes.map((change) => fsp.readFile(URI.parse(change.uri).fsPath, 'utf-8'))
    );

    changes.forEach((c, index) => {
      const readJsonResult = packageJsons[index];
      if (readJsonResult.status === 'fulfilled') {
        const parsedUri = URI.parse(c.uri);
        const projectRootUri = Utils.dirname(parsedUri).toString();
        const hasChakra = !!JSON.parse(readJsonResult.value).dependencies?.['@chakra-ui/react'];
        this.uriToHasChakra.set(projectRootUri, hasChakra);
      }

      console.log(this.uriToHasChakra, 'HAS CHAKRA DEPENDENCY URI MAP');
    });
  }

  findHasChakraByUri(textDocumentUri: string) {
    return Array.from(this.uriToHasChakra.entries()).find(
      ([workspaceFolderUri, hasChakra]) =>
        isSubPathOf(workspaceFolderUri, textDocumentUri) && hasChakra
    );
  }
}
