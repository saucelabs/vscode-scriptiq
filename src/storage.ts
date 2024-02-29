import * as vscode from 'vscode';

/**
 * GlobalStorage allows you to persist and retrieve data. The storage is global
 * and not tied a workspace.
 */
export class GlobalStorage {
  private readonly storageUri: vscode.Uri;

  constructor(storageUri: vscode.Uri) {
    this.storageUri = storageUri;
  }

  /**
   * Returns a Uri for the location of test records. Accepts additional segments
   * to create a more specific Uri.
   */
  getHistoryUri(...segments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(
      this.storageUri,
      'scriptiq_history',
      ...segments,
    );
  }
}
