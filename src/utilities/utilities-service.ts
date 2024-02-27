import { Uri, Webview } from 'vscode';
import * as vscode from 'vscode';

/**
 * Set storeData into context.globalState.
 * @param context :vscode.ExtensionContext
 * @param storeData : any
 */
export function setStoreData(
  context: vscode.ExtensionContext,
  storeData: any,
  key: string,
) {
  const state = stateManager(context);

  if (storeData !== undefined) {
    state.write(
      {
        storeData: storeData,
      },
      key,
    );
  }
}

/**
 * Gets storeData from context.globalState.
 * @param context :vscode.ExtensionContext
 * @returns string
 */
export function getStoreData(
  context: vscode.ExtensionContext,
  key: string,
): any {
  const state = stateManager(context);

  const { storeData } = state.read(key);
  return storeData as any;
}

/**
 * State Manager has read and write methods for api key. This methods set and get the api key from context.globalState.
 * @param context :vscode.ExtensionContext.
 * @returns void.
 */
export function stateManager(context: vscode.ExtensionContext) {
  return {
    read,
    write,
  };

  function read(key: string) {
    return {
      storeData: context.globalState.get(key),
    };
  }

  function write(newState: any, key: string) {
    context.globalState.update(key, newState.storeData);
  }
}

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
 * Generate a name for a previous test
 */
export function getHistoryName(history: any) {
  let name = '';
  const apk = history.apk;
  const goal = history.goal;
  name += apk.substring(0, apk.lastIndexOf('.'));
  name += ': ';
  name += goal;
  return name;
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
  ); // Also use name in full-test-gen-view-panel.ts
}

/**
 * Uri for history
 */
export function getScreenshotUri(context: vscode.ExtensionContext) {
  return vscode.Uri.joinPath(context.extensionUri, 'media', 'screenshots'); // Also use name in full-test-gen-view-panel.ts
}
