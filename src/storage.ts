import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { TestRecord } from './types';

/**
 * GlobalStorage allows you to persist and retrieve data. The storage is global
 * and not tied a workspace.
 *
 * Call `init()` to ensure that the storage is fully initialized before storing
 * any data.
 */
export class GlobalStorage {
  private readonly storageUri: vscode.Uri;

  constructor(storageUri: vscode.Uri) {
    this.storageUri = storageUri;
  }

  /**
   * Initializes the global storage by creating, if necessary, its backing file
   * structure.
   */
  init() {
    fs.mkdirSync(this.getHistoryUri().path, { recursive: true });
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

  deleteTestRecord(id: string) {
    if (!id) {
      return;
    }

    fs.rmSync(this.getHistoryUri(id).path, { recursive: true });
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
