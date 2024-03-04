// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarViewProvider } from './panels/sidebar';
import { TestGenerationPanel } from './panels/test-generation';
import { getScreenshotUri } from './utilities/utilities-service';
import { GlobalStorage } from './storage';
import {
  CLEAR_HISTORY_LINK_SELECTION,
  SHOW_TEST_GENERATION_PANEL,
  UPDATE_HISTORY_LINKS,
} from './commands';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "sauce-scriptiq" is now active!',
  );

  const storage = new GlobalStorage(context.globalStorageUri);
  storage.init();

  vscode.workspace.fs.createDirectory(getScreenshotUri(context));

  const testGenerationPanelCommand = vscode.commands.registerCommand(
    SHOW_TEST_GENERATION_PANEL,
    (testID?: string) => {
      TestGenerationPanel.render(context, testID);
    },
  );
  context.subscriptions.push(testGenerationPanelCommand);

  // Side Bar View Provider
  const provider = new SidebarViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      provider,
    ),
  );

  const updateHistoryLinksCommand = vscode.commands.registerCommand(
    UPDATE_HISTORY_LINKS,
    (selected: number = -1) => {
      provider.updateHistoryLinks(selected);
    },
  );
  context.subscriptions.push(updateHistoryLinksCommand);

  const clearHistoryLinkSelectionCommand = vscode.commands.registerCommand(
    CLEAR_HISTORY_LINK_SELECTION,
    () => {
      provider.clearHistoryLinkSelection();
    },
  );
  context.subscriptions.push(clearHistoryLinkSelectionCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
