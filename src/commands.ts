// Show the Test Generation Panel. Optionally accepts a test_id `string` argument
// to load a specific test record.
import * as vscode from 'vscode';

export const SHOW_TEST_GENERATION_PANEL_ID = 'scriptiq.showTestGenerationPanel';

export function registerShowTestGenerationPanelCommand(
  ctx: vscode.ExtensionContext,
  callback: (testID?: string) => void,
) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand(SHOW_TEST_GENERATION_PANEL_ID, callback),
  );
}

export function executeShowTestGenerationPanelCommand(testID?: string) {
  vscode.commands.executeCommand(SHOW_TEST_GENERATION_PANEL_ID, testID);
}

export function registerUpdateHistoryLinksCommand(
  ctx: vscode.ExtensionContext,
  callback: (testID?: string) => void,
) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand(UPDATE_HISTORY_LINKS_ID, callback),
  );
}

export function executeUpdateHistoryLinksCommand(testID?: string) {
  vscode.commands.executeCommand(UPDATE_HISTORY_LINKS_ID, testID);
}

// Update the history side panel with the latest test records. Optionally
// accepts a `number` argument to select a specific test record.
export const UPDATE_HISTORY_LINKS_ID = 'scriptiq.updateHistoryLinks';
