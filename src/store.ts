import * as vscode from 'vscode';
import { Credentials } from './types';

/**
 * Store allows you to persist and retrieve data. The storage is global and
 * persists across VS Code sessions. Do not store blobs or otherwise large data.
 */
export class Store {
  private mem: vscode.Memento;

  constructor(mem: vscode.Memento) {
    this.mem = mem;
  }

  get<T>(key: string): T | undefined {
    return this.mem.get<T>(key);
  }

  save(key: string, value: unknown) {
    this.mem.update(key, value);
  }

  getCredentials(): Credentials | undefined {
    return this.get<Credentials>('credentials');
  }

  saveCredentials(credentials: Credentials) {
    this.save('credentials', credentials);
  }
}
