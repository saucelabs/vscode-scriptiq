import * as vscode from 'vscode';
import { Credentials } from './types';

/**
 * Memento allows you to persist and retrieve data. The storage is global and
 * persists across VS Code sessions. Do not store blobs or otherwise large data.
 */
export class Memento {
  private mem: vscode.Memento;

  constructor(mem: vscode.Memento) {
    this.mem = mem;
  }

  get<T>(key: string): T | undefined {
    return this.mem.get<T>(key);
  }

  async save(key: string, value: unknown) {
    await this.mem.update(key, value);
  }

  getCredentials(): Credentials | undefined {
    return this.get<Credentials>('credentials');
  }

  async saveCredentials(credentials: Credentials) {
    await this.save('credentials', credentials);
  }

  getTestIDs(): string[] {
    return this.get<string[]>('testHistory') ?? [];
  }

  async saveTestIDs(testIDs: string[]) {
    await this.save('testHistory', testIDs);
  }

  /**
   * Returns the last known storage schema version.
   */
  getSchemaVersion(): string {
    return this.get('schemaVersion') || '';
  }

  /**
   * Saves `version` as the last known storage schema version.
   * It is the caller's responsibility to ensure that the version is valid and
   * that data has been migrated correctly. Data corruption may occur if the
   * aforementioned conditions are not met.
   */
  async saveSchemaVersion(version: string) {
    await this.save('schemaVersion', version);
  }
}
