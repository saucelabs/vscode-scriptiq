import * as vscode from 'vscode';
import {
  getNonce,
  setStoreData,
  getStoreData,
  getHistoryName,
  getHistoryUri,
} from '../utilities/utilities-service';
import { Store } from '../store';
import * as toast from '../toast';

export class SideBarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scriptiq-settings-id';

  private view?: vscode.WebviewView;
  private viewCtx?: vscode.WebviewViewResolveContext;
  private cancelToken?: vscode.CancellationToken;
  private store: Store;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly ctx: vscode.ExtensionContext,
  ) {
    this.store = new Store(ctx.globalState);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ) {
    this.view = webviewView;
    this.viewCtx = context;
    this.cancelToken = token;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this.extensionUri,
        vscode.Uri.joinPath(this.extensionUri, 'media', 'images'),
      ],
    };

    webviewView.webview.html = this.getHTMLForWebview(webviewView.webview);

    this.subscribeToWebviewEvents(webviewView.webview);
  }

  /**
   * Add listener for events from js.
   */
  private subscribeToWebviewEvents(webview: vscode.Webview) {
    webview.onDidReceiveMessage((message: any) => {
      const command = message.command;
      let historyIndex = -1;
      switch (command) {
        case 'start-test-generation-command':
          this.startTestGenerationWebViewPanel();
          break;

        case 'save-credentials': {
          if (
            !message.data.username ||
            !message.data.accessKey ||
            !message.data.region
          ) {
            toast.showError('Cannot save incomplete credentials.');
            break;
          }

          this.store.saveCredentials({
            username: message.data.username,
            accessKey: message.data.accessKey,
            region: message.data.region,
          });
          toast.showInfo('Credentials saved successfully.');
          webview.html = this.getHTMLForWebview(webview);
          break;
        }
        case 'load-language':
          this.updateHistoryLinks();
          break;

        case 'load-history-links':
          this.updateHistoryLinks();
          break;

        case 'load-history': {
          const history_list = getStoreData(this.ctx, 'history');
          for (let x = 0; x < history_list.length; x++) {
            if (message.data == history_list[x].testID) {
              historyIndex = x;
              break;
            }
          }
          if (historyIndex >= 0) {
            setStoreData(this.ctx, historyIndex, 'curr_history');
            vscode.commands.executeCommand('testLoadHistory.start');
          }
          break;
        }

        case 'delete-history': {
          const historyList = getStoreData(this.ctx, 'history');
          for (let x = 0; x < historyList.length; x++) {
            if (message.data == historyList[x].testID) {
              historyIndex = x;
              break;
            }
          }
          if (historyIndex >= 0) {
            // setStoreData(this.ctx, historyIndex, "curr_history");
            console.log('DELETE HISTORY: ', historyIndex);
            console.log(message.data);

            vscode.workspace.fs.delete(
              getHistoryUri(this.ctx, [message.data]),
              { recursive: true },
            );
            console.log('file removed');

            historyList.splice(historyIndex, 1);
            setStoreData(this.ctx, historyList, 'history');
            this.updateHistoryLinks();
            vscode.commands.executeCommand('testGeneration.start');
          }
          break;
        }
      }
    }, undefined);
  }

  /**
   * Start main panel.
   */
  private startTestGenerationWebViewPanel(): void {
    vscode.commands.executeCommand('testGeneration.start');
  }

  public clearHistoryLinkSelection(): void {
    this.view?.webview.postMessage({ command: 'clear-history-links' });
  }

  public updateHistoryLinks(selected: number = -1): void {
    const historyList = getStoreData(this.ctx, 'history');
    for (let x = 0; x < historyList.length; x++) {
      if ('goal' in historyList[x]) {
        historyList[x].name = getHistoryName(historyList[x]);
      }
    }
    this.view?.webview.postMessage({
      command: 'update-history-links',
      data: historyList,
      selected: selected,
    });
  }

  public updateHistoryLinksNewTest(): void {
    this.updateHistoryLinks(0);
  }

  private getHTMLForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'side-bar.js'),
    );

    // Do the same for the stylesheet.
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'vscode.css'),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    const creds = this.store.getCredentials();

    let settingsTabButton, historyTabButton, settingsTabData, historyTabData;
    if (!creds?.username && !creds?.accessKey && !creds?.region) {
      settingsTabButton = ' class="active"';
      historyTabButton = '';
      settingsTabData = ' in active';
      historyTabData = '';
    } else {
      settingsTabButton = '';
      historyTabButton = ' class="active"';
      settingsTabData = '';
      historyTabData = ' in active';
    }

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link href="${styleVSCodeUri}" rel="stylesheet">
		<link rel="stylesheet"
	  href="https://fonts.googleapis.com/css?family=DM+Mono">
	  <link rel="stylesheet"
	  href="https://fonts.googleapis.com/css?family=DM+Sans">
	  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
	
	  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
	  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
            <title>Panel</title>
        </head>
        <body>

        <div class="intro-container">
			<h5>Welcome to ScriptIQ!</h5>
			<p>Create test scripts in minutes with the power of Sauce Labs AI.</p>
            <button id="start-test-generation-button" class="button button-primary">Create New Test</button>	
        </div>

		<br/>
		<ul class="nav nav-tabs">
			<li${settingsTabButton}><a data-toggle="tab" href="#settings">Settings</a></li>
			<li${historyTabButton}><a data-toggle="tab" href="#history">History</a></li>
		</ul>

		<br/>
		<div class="tab-content">
			<div id="history" class="tab-pane fade${historyTabData}">
				<div class="history-empty">
					<h5>History</h5>
					<p id="history-intro" class="intro-container">Your goal history will appear here once you generate tests. Click the <code>Create New Test</code> button to start.</p>	
				</div>
				<div id="history-links">
				</div>
			</div>
			<div id="settings" class="tab-pane fade${settingsTabData}">
				<div id="language-options">
				</div>
				<h5>Sauce Labs Credentials</h5>
				<div class="form-container">
					<label for="username-text-field-id">Sauce Username</label>
					<input id="username-text-field-id" value="${creds?.username ?? ''}" placeholder="e.g. oauth-test-user-12345" />							
				</div>		
				<div class="form-container">
					<label for="access-key-text-field-id">Sauce Access Key</label>
					<input id="access-key-text-field-id" value="${creds?.accessKey ?? ''}" type="password" placeholder="e.g. 1a2b34c5-6d7e-8901-23fg-15afd48faw" />				
				</div>
				<div class="form-container">
					<label for="region-text-field-id">Sauce Labs Region</label>
					<input id="region-text-field-id" value="${creds?.region ?? ''}" placeholder="e.g. us-west-1" />				
				</div>
				<div class="form-container">
					<button id="save-button-id" class="button button-primary">Save</button>
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
				<div class="sidebar-footer">
				<p>Not sure what your credentials are? Find them inside the Sauce Labs platform: <a href="https://accounts.saucelabs.com/"> ${'Log In'}</a></p>
				</div>
			</div>
		</div>
    
        </body>
        </html>`;
  }
}
