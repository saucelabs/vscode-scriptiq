import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { TestRecord } from './types';

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

  saveTestRecord(record: TestRecord) {
    if (!record.testID) {
      throw new Error('failed to persist test record: missing ID');
    }

    fs.writeFileSync(
      this.getHistoryUri(record.testID, 'data.json').path,
      JSON.stringify(record),
      {
        encoding: 'utf-8',
      },
    );
  }
}
