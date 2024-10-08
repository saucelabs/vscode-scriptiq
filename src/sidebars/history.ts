import * as vscode from 'vscode';
import * as path from 'node:path';

import { Memento } from '../memento';
import { GlobalStorage } from '../storage';
import { TestStep, TestRecord } from '../types';
import * as toast from '../toast';
import { errMsg } from '../error';
import { executeShowTestGenerationPanelCommand } from '../commands';

export class HistoryProvider
  implements vscode.TreeDataProvider<TestStep | TestRecord>
{
  public static readonly viewType = 'scriptiq-history';

  constructor(
    private readonly _storage: GlobalStorage,
    private readonly _memento: Memento,
  ) {}

  getTreeItem(
    element: TestStep | TestRecord,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if ('app_name' in element) {
      return new TestRecordItem(element);
    }
    return new TestStepItem(element);
  }

  getChildren(
    element?: TestStep | TestRecord | undefined,
  ): vscode.ProviderResult<TestRecord[] | TestStep[]> {
    if (element) {
      if ('all_steps' in element) {
        return (element as TestRecord).all_steps;
      }
    } else {
      const ids = this._memento.getTestIDs();
      const testRecords = this._storage.getTestRecords(ids);

      return testRecords;
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    void | TestStep | TestRecord | (TestStep | TestRecord)[] | null | undefined
  > = new vscode.EventEmitter<
    void | TestStep | TestRecord | (TestStep | TestRecord)[] | null | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<
    void | TestStep | TestRecord | (TestStep | TestRecord)[] | null | undefined
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async deleteItem(testID: string) {
    try {
      const ids = this._memento.getTestIDs();
      const historyIndex = ids.findIndex((id) => id == testID);
      if (historyIndex < 0) {
        return;
      }

      console.log('Deleting historic entry: ', historyIndex);

      ids.splice(historyIndex, 1);
      await this._memento.saveTestIDs(ids);
      this._storage.deleteTestRecord(testID);

      console.log('Test Record deleted.');
    } catch (e) {
      toast.showError(`Failed to delete test record: ${errMsg(e)}`);
    }

    this.refresh();
    executeShowTestGenerationPanelCommand();
  }

  async deleteAll() {
    try {
      await this._memento.clearHistory();
      this._storage.clearHistory();
      toast.showInfo('Test record history cache successfully cleared.');
    } catch (e) {
      toast.showError(`Failed to clear history: ${errMsg(e)}`);
    }

    this.refresh();
    executeShowTestGenerationPanelCommand();
  }
}

class TestRecordItem extends vscode.TreeItem {
  constructor(record: TestRecord) {
    super(record.app_name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'testRecord';
    this.command = {
      command: 'scriptiq.showTestGenerationPanel',
      arguments: [record.test_id],
      title: 'Show Test',
    };
  }
}

class TestStepItem extends vscode.TreeItem {
  constructor(step: TestStep) {
    super(step.event_reason, vscode.TreeItemCollapsibleState.None);
  }

  iconPath = path.join(
    __filename,
    '..',
    '..',
    'media',
    'icons',
    'icn-edit-file-outline.svg',
  );
}
