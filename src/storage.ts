import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { TestRecord } from './types';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { finished } from 'node:stream/promises';
import * as path from 'node:path';

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

  getTestRecord(id: string): TestRecord {
    if (!id) {
      throw new Error('failed to retrieve test record: missing ID');
    }

    const dest = this.getHistoryUri(id, 'data.json').path;
    const data = fs.readFileSync(dest, {
      encoding: 'utf-8',
    });

    return JSON.parse(data);
  }

  saveTestRecord(record: TestRecord) {
    if (!record.testID) {
      throw new Error('failed to persist test record: missing ID');
    }

    const dest = this.getHistoryUri(record.testID, 'data.json').path;
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    fs.writeFileSync(dest, JSON.stringify(record), {
      encoding: 'utf-8',
    });
  }

  async saveTestRecordAsset(
    testID: string,
    name: string,
    data: ReadableStream,
  ) {
    const dest = this.getHistoryUri(testID, name).path;
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const fileStream = fs.createWriteStream(dest);
    await finished(Readable.fromWeb(data).pipe(fileStream));
  }
}
