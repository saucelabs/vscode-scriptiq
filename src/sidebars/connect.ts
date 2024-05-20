import * as vscode from 'vscode';

import { getNonce, html } from '../html';
import { Memento } from '../memento';
import * as toast from '../toast';
import { errMsg } from '../error';
import { isValidRegion } from '../types';

export class ConnectViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scriptiq-connect';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _memento: Memento,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    const nonce = getNonce();
    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'webview-ui',
        'connect',
        'build',
        'assets',
        'index.js',
      ),
    );

    const creds = this._memento.getCredentials();

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
          <script nonce="${nonce}">
            window.creds = '${JSON.stringify(creds)}';
          </script>
        </head>
        <body>
          <div id="root" />
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;

    webviewView.webview.onDidReceiveMessage(async (msg: any) => {
      switch (msg.action) {
        case 'save-credentials': {
          await this.saveCredentials(
            msg.data.username,
            msg.data.accessKey,
            msg.data.region,
          );
          break;
        }
      }
    });
  }

  private async saveCredentials(
    username: string,
    accessKey: string,
    region: string,
  ) {
    if (!username || !accessKey || !region) {
      toast.showError('Cannot save incomplete credentials.');
      return;
    }
    if (!isValidRegion(region)) {
      toast.showError(
        "Invalid region. The value must be one of the following: 'us-west-1' or 'eu-central-1'.",
      );
      return;
    }

    try {
      await this._memento.saveCredentials({
        username: username,
        accessKey: accessKey,
        region: region,
      });
    } catch (e) {
      toast.showError(`Failed to save credentials: ${errMsg(e)}`);
      return;
    }

    toast.showInfo('Credentials saved successfully.');
  }
}
