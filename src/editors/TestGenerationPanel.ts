import {
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from 'vscode';
import { Memento } from '../memento';
import { GlobalStorage } from '../storage';
import { getNonce, html } from '../html';

export class TestGenerationPanel {
  public static currentPanel: TestGenerationPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _memento: Memento;
  private _storage: GlobalStorage;
  private _disposables: Disposable[] = [];

  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
  ) {
    this._panel = panel;
    this._memento = memento;
    this._storage = storage;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      context.extensionUri,
    );

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(
    context: ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
    // testID?: string,
  ) {
    if (TestGenerationPanel.currentPanel) {
      // If the webview panel already exists reveal it
      TestGenerationPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        'test-generation',
        'Ask ScriptIQ',
        ViewColumn.One,
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [context.extensionUri],
        },
      );

      TestGenerationPanel.currentPanel = new TestGenerationPanel(
        panel,
        context,
        memento,
        storage,
      );
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    TestGenerationPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = webview.asWebviewUri(
      Uri.joinPath(
        extensionUri,
        'webview-ui',
        'test-generation',
        'build',
        'assets',
        'index.css',
      ),
    );
    // The JS file from the React build output
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(
        extensionUri,
        'webview-ui',
        'test-generation',
        'build',
        'assets',
        'index.js',
      ),
    );

    const nonce = getNonce();

    return html`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <meta
            http-equiv="Content-Security-Policy"
            content="style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
          />
          <link rel="stylesheet" type="text/css" href="${stylesUri}" />
          <title>Test Generation</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (_message: any) => {
        // const command = message.command;
        // const text = message.text;
        // switch (
        //   command
        //   //   case "hello":
        //   //     // Code that should run in response to the hello message command
        //   //     // window.showInformationMessage(text);
        //   //     return;
        //   //   // Add more switch case statements here as more webview message commands
        //   //   // are created within the webview context (i.e. inside media/main.js)
        // ) {
        // }
      },
      undefined,
      this._disposables,
    );
  }
}
