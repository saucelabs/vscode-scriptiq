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

// Clear the selection of test records in the history side panel.
export const CLEAR_HISTORY_LINK_SELECTION_ID =
  'scriptiq.clearHistoryLinkSelection';

export function registerUpdateHistoryLinksCommand(
  ctx: vscode.ExtensionContext,
  callback: (selected?: number) => void,
) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand(UPDATE_HISTORY_LINKS_ID, callback),
  );
}

export function executeUpdateHistoryLinksCommand(selected?: number) {
  vscode.commands.executeCommand(UPDATE_HISTORY_LINKS_ID, selected);
}

// Update the history side panel with the latest test records. Optionally
// accepts a `number` argument to select a specific test record.
export const UPDATE_HISTORY_LINKS_ID = 'scriptiq.updateHistoryLinks';

export function registerClearHistoryLinkSelectionCommand(
  ctx: vscode.ExtensionContext,
  callback: () => void,
) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand(CLEAR_HISTORY_LINK_SELECTION_ID, callback),
  );
}

export function executeClearHistoryLinkSelectionCommand() {
  vscode.commands.executeCommand(CLEAR_HISTORY_LINK_SELECTION_ID);
}
