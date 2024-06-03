// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { TestGenerationPanel } from './panels/test-generation';
import { TestGenerationPanel } from './editors/TestGenerationPanel';
import { ConnectViewProvider } from './sidebars/connect';
import { HistoryProvider } from './sidebars/history';
import { GlobalStorage } from './storage';
import { Memento } from './memento';
import {
  registerShowTestGenerationPanelCommand,
  registerUpdateHistoryLinksCommand,
} from './commands';
import { TestRecord } from './types';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "sauce-scriptiq" is now active!',
  );

  const storage = new GlobalStorage(context.globalStorageUri);
  storage.init();

  const memento = new Memento(context.globalState);
  const lastKnownSchemaVersion = memento.getSchemaVersion();

  if (!storage.isSchemaUpToDate(lastKnownSchemaVersion)) {
    console.log('Storage schema is out of date.');
    // A fresh install won't have a persisted schema, so there's no need to
    // perform a migration.
    if (lastKnownSchemaVersion) {
      console.log('Migrating storage schema...');
      storage.migrate(lastKnownSchemaVersion);
    }
    await memento.saveSchemaVersion(storage.schemaVersion);
  }

  registerShowTestGenerationPanelCommand(context, (testID?: string) => {
    TestGenerationPanel.render(context, memento, storage, testID);
  });

  const connectProvider = new ConnectViewProvider(
    context.extensionUri,
    memento,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ConnectViewProvider.viewType,
      connectProvider,
    ),
  );

  const historyProvider = new HistoryProvider(storage, memento);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      HistoryProvider.viewType,
      historyProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'scriptiq-history.deleteEntry',
      async (testRecord: TestRecord) => {
        await historyProvider.deleteItem(testRecord.test_id);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('scriptiq-history.deleteAll', async () => {
      await historyProvider.deleteAll();
    }),
  );

  registerUpdateHistoryLinksCommand(context, () => {
    historyProvider.refresh();
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
