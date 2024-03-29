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
import { DATA_MODEL_VERSION } from './config';
import { migration } from './data';
import * as toast from './toast';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "sauce-scriptiq" is now active!',
  );

  const memento = new Memento(context.globalState);
  const dataModelVersion = memento.getDataModelVersion();
  if (dataModelVersion !== DATA_MODEL_VERSION) {
    if (dataModelVersion) {
      toast.showError(
        'Data model version has changed: earlier test records are outdated and cannot be loaded. Please follow the instructions to migrate your data.',
      );
      migration(memento);
    }
    // Update dataModelVersion on the extension's first run or whenever the dataModelVersion is updated.
    memento.saveDataModelVersion(DATA_MODEL_VERSION);
  }

  const storage = new GlobalStorage(
    context.globalStorageUri,
    DATA_MODEL_VERSION,
  );
  storage.init();

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
