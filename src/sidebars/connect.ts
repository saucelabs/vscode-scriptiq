import * as vscode from 'vscode';

import { getNonce, html } from '../html';

export class ConnectViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scriptiq-connect';

  private _view?: vscode.WebviewView;

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    const nonce = getNonce();

    webviewView.webview.html = html`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <!--
                Use a content security policy to only allow loading styles from our extension directory,
                and only allow scripts that have a specific nonce.
                (See the 'webview-sample' extension sample for img-src content security policy examples)
            -->
          <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; style-src ${webviewView.webview
              .cspSource}; script-src 'nonce-${nonce}';"
          />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>Connect</title>
        </head>
        <body>
          <h1>Connect</h1>
        </body>
      </html>
    `;
  }
}
