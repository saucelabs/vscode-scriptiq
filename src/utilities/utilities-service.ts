import { Uri, Webview } from 'vscode';
import * as vscode from 'vscode';

/**
 * Create a vscode.Uri as WebviewUri for source files.
 * @param webview :vscode.Weview
 * @param extensionUri :vscode.Uri
 * @param pathList :string[]
 * @returns vscode.Uri
 */
export function getAsWebviewUri(
  webview: Webview,
  extensionUri: Uri,
  pathList: string[],
) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

/**
 * Create a vscode.Uri for source files.
 * @param extensionUri :vscode.Uri
 * @param pathList :strig[]
 * @returns vscode.Uri
 */
export function getVSCodeUri(extensionUri: Uri, pathList: string[]) {
  return vscode.Uri.joinPath(extensionUri, ...pathList);
}

export function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Uri for history
 */
export function getHistoryUri(
  context: vscode.ExtensionContext,
  pathList: string[],
) {
  return vscode.Uri.joinPath(
    context.globalStorageUri,
    'scriptiq_history',
    ...pathList,
  ); // Also use name in test-generation.ts
}

/**
 * Uri for history
 */
export function getScreenshotUri(context: vscode.ExtensionContext) {
  return vscode.Uri.joinPath(context.extensionUri, 'media', 'screenshots'); // Also use name in test-generation.ts
}
