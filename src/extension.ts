// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SideBarViewProvider } from './panels/side-bar-view-panel';
import { TestGenerationPanel } from './panels/full-test-gen-view-panel';
import { getHistoryUri, getScreenshotUri } from './utilities/utilities-service';
import { Store } from './store';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "sauce-scriptiq" is now active!',
  );

  const store = new Store(context.globalState);
  const history = store.getHistory();
  console.log('history', history);
  if (history === undefined) {
    // FIXME why do we need to set the history to an empty array here?
    store.saveHistory([]);
  }
  vscode.workspace.fs.createDirectory(getHistoryUri(context, []));
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
    () => {
      TestGenerationPanel.render(context, true);
    },
  );
  context.subscriptions.push(testLoadHistoryCommand);

  // Side Bar View Provider
  const provider = new SideBarViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SideBarViewProvider.viewType,
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
