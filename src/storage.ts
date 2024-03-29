import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { Vote, TestRecord } from './types';
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

  constructor(storageUri: vscode.Uri, dataModelVersion: string) {
    this.storageUri = vscode.Uri.joinPath(storageUri, dataModelVersion);
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
    // Example: $USER/Library/Application Support/Code/User/globalStorage/undefined_publisher.vscode-scriptiq/v1/scriptiq_history
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

  getTestRecords(ids: string[]): TestRecord[] {
    const testRecords: TestRecord[] = [];
    ids.forEach((id) => {
      testRecords.push(this.getTestRecord(id));
    });
    return testRecords;
  }

  saveTestRecord(record: TestRecord) {
    if (!record.test_id) {
      throw new Error('failed to persist test record: missing ID');
    }

    const dest = this.getHistoryUri(record.test_id, 'data.json').path;
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    fs.writeFileSync(dest, JSON.stringify(record), {
      encoding: 'utf-8',
    });
  }

  getVotes(test_id: string): Vote[] {
    if (!test_id) {
      throw new Error(
        'failed to retrieve test record related votes: missing test_record ID',
      );
    }
    const dest = this.getHistoryUri(test_id, 'votes.json').path;
    // Return a default empty array if votes.json is not found.
    if (!fs.existsSync(dest)) {
      return [];
    }
    const data = fs.readFileSync(dest, {
      encoding: 'utf-8',
    });

    return JSON.parse(data);
  }

  saveVotes(test_id: string, votes: Vote[]) {
    if (!test_id) {
      throw new Error(
        'failed to persist test_record related votes: missing test_record ID',
      );
    }
    const dest = this.getHistoryUri(test_id, 'votes.json').path;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(votes), { encoding: 'utf-8' });
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
