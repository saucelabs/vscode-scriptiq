// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarViewProvider } from './panels/sidebar';
import { TestGenerationPanel } from './panels/test-generation';
import { getScreenshotUri } from './utilities/utilities-service';
import { GlobalStorage } from './storage';
import * as fs from 'node:fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "sauce-scriptiq" is now active!',
  );

  const storage = new GlobalStorage(context.globalStorageUri);

  fs.mkdirSync(storage.getHistoryUri().path, { recursive: true });
  vscode.workspace.fs.createDirectory(getScreenshotUri(context));

  const testGenerationPanelCommand = vscode.commands.registerCommand(
    'testGeneration.start',
    () => {
      TestGenerationPanel.render(context);
    },
  );
  context.subscriptions.push(testGenerationPanelCommand);

  const testLoadHistoryCommand = vscode.commands.registerCommand(
    'testLoadHistory.start',
    (testID?: string) => {
      TestGenerationPanel.render(context, testID);
    },
  );
  context.subscriptions.push(testLoadHistoryCommand);

  // Side Bar View Provider
  const provider = new SidebarViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      provider,
    ),
  );

  const updateHistoryLinksCommand = vscode.commands.registerCommand(
    'updateHistoryLinks.start',
    () => {
      provider.updateHistoryLinks();
    },
  );
  context.subscriptions.push(updateHistoryLinksCommand);

  const updateHistoryLinksNewTestCommand = vscode.commands.registerCommand(
    'updateHistoryLinksNewTest.start',
    () => {
      provider.updateHistoryLinksNewTest();
    },
  );
  context.subscriptions.push(updateHistoryLinksNewTestCommand);

  const clearHistoryLinkSelectionCommand = vscode.commands.registerCommand(
    'clearHistoryLinkSelection.start',
    () => {
      provider.clearHistoryLinkSelection();
    },
  );
  context.subscriptions.push(clearHistoryLinkSelectionCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
