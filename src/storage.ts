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
  // All supported schema versions.
  readonly schemaVersions: string[] = ['v1'];

  // The current schema version.
  readonly schemaVersion: string = this.schemaVersions[0];

  private readonly storageUri: vscode.Uri;

  constructor(storageUri: vscode.Uri) {
    this.storageUri = vscode.Uri.joinPath(storageUri, this.schemaVersion);
  }

  /**
   * Initializes the global storage by creating, if necessary, its backing file
   * structure.
   */
  init() {
    fs.mkdirSync(this.getHistoryUri().fsPath, { recursive: true });
  }

  isSchemaUpToDate(version: string): boolean {
    return version == this.schemaVersion;
  }

  /**
   * Perform a migration from the given version to the current schema version.
   * @param fromVersion
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  migrate(fromVersion: string) {
    // Future migration logic goes here
  }

  /**
   * Returns a Uri for the location of test records. Accepts additional segments
   * to create a more specific Uri.
   */
  getHistoryUri(...segments: string[]): vscode.Uri {
    // Example: /Users/$USER/Library/Application\ Support/Code/User/globalStorage/saucelabs.vscode-scriptiq/v1/scriptiq_history/
    return vscode.Uri.joinPath(
      this.storageUri,
      'scriptiq_history',
      ...segments,
    );
  }

  verifyTestIds(ids: string[]): string[] {
    return ids.filter((id) => {
      const uri = this.getHistoryUri(id);
      try {
        return fs.existsSync(uri.fsPath);
      } catch (err) {
        console.error(`Failed to check existence for ${uri.fsPath}: ${err}`);
        return false;
      }
    });
  }

  deleteTestRecord(id: string) {
    if (!id) {
      return;
    }

    fs.rmSync(this.getHistoryUri(id).fsPath, { recursive: true });
  }

  getTestRecord(id: string): TestRecord {
    if (!id) {
      throw new Error('failed to retrieve test record: missing ID');
    }

    const dest = this.getHistoryUri(id, 'data.json').fsPath;
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
    if (!record.app_name) {
      throw new Error(
        'failed to persist test record: missing application name',
      );
    }
    if (!record.goal) {
      throw new Error('failed to persist test record: missing test goal');
    }

    const dest = this.getHistoryUri(record.test_id, 'data.json').fsPath;
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
    const dest = this.getHistoryUri(test_id, 'votes.json').fsPath;
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
    const dest = this.getHistoryUri(test_id, 'votes.json').fsPath;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(votes), { encoding: 'utf-8' });
  }

  async saveTestRecordAsset(
    testID: string,
    name: string,
    data: ReadableStream,
  ) {
    const dest = this.getHistoryUri(testID, name).fsPath;
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const fileStream = fs.createWriteStream(dest);
    await finished(Readable.fromWeb(data).pipe(fileStream));
  }

  clearHistory() {
    console.log('Removing test records from local storage...');
    fs.rmSync(this.getHistoryUri().fsPath, { recursive: true });
  }
}
