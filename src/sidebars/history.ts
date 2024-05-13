import * as vscode from 'vscode';

import { Memento } from '../memento';
import { GlobalStorage } from '../storage';
import { TestStep, TestRecord } from '../types';

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
      const item = new TestRecordItem(element);
      item.command = {
        command: 'scriptiq.showTestGenerationPanel',
        arguments: [element.test_id],
        title: 'Show Test',
      };
      return item;
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
      return this._getTestHistory();
    }
  }

  _getTestHistory() {
    const ids = this._memento.getTestIDs();
    const testRecords = this._storage.getTestRecords(ids);

    return testRecords;
  }
}

class TestRecordItem extends vscode.TreeItem {
  constructor(record: TestRecord) {
    super(record.app_name, vscode.TreeItemCollapsibleState.Collapsed);
  }
}

class TestStepItem extends vscode.TreeItem {
  constructor(step: TestStep) {
    super(step.event_reason, vscode.TreeItemCollapsibleState.None);

    // TODO: Define icon, action, context
  }
}
