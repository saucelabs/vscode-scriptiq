// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarViewProvider } from './panels/sidebar';
import { TestGenerationPanel } from './panels/test-generation';
import { GlobalStorage } from './storage';
import { Memento } from './memento';
import {
  registerClearHistoryLinkSelectionCommand,
  registerShowTestGenerationPanelCommand,
  registerUpdateHistoryLinksCommand,
} from './commands';

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
    // A fresh install won't have a persisted model version, so there's no need
    // to perform a migration.
    if (lastKnownSchemaVersion) {
      console.log('Migrating storage schema...');
      storage.migrate(lastKnownSchemaVersion);
    }
    await memento.saveSchemaVersion(storage.schemaVersion);
  }

  registerShowTestGenerationPanelCommand(context, (testID?: string) => {
    TestGenerationPanel.render(context, memento, storage, testID);
  });

  // Side Bar View Provider
  const provider = new SidebarViewProvider(
    context.extensionUri,
    memento,
    storage,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      provider,
    ),
  );

  registerUpdateHistoryLinksCommand(context, (selected = -1) => {
    provider.updateHistoryLinks(selected);
  });

  registerClearHistoryLinkSelectionCommand(context, () => {
    provider.clearHistoryLinkSelection();
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
