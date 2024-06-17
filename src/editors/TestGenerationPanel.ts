import {
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  commands,
  env,
  window,
  workspace,
} from 'vscode';
import { WebSocket } from 'undici';
import * as toast from '../toast';
import { errMsg } from '../error';
import { Memento } from '../memento';
import { GlobalStorage } from '../storage';
import { getNonce, html } from '../html';
import { Credentials, Platform } from '../types';
import { generateTest } from '../api/llm/ws';
import { sendUserRating } from '../api/llm/http';
import { executeUpdateHistoryLinksCommand } from '../commands';

const MAX_HISTORY_LEN = 100;

export class TestGenerationPanel {
  public static currentPanel: TestGenerationPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _memento: Memento;
  private _storage: GlobalStorage;
  private _socket: WebSocket | undefined;
  private _disposables: Disposable[] = [];

  private _msgQueue: MessageQueue;
  private _testRecordNavigation: boolean;

  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
  ) {
    this._panel = panel;
    this._memento = memento;
    this._storage = storage;
    this._testRecordNavigation = false;

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

    this._msgQueue = new MessageQueue(this._panel.webview);
  }

  public static render(
    context: ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
    testID?: string,
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
          localResourceRoots: [context.extensionUri, storage.getHistoryUri()],
          retainContextWhenHidden: true,
        },
      );

      TestGenerationPanel.currentPanel = new TestGenerationPanel(
        panel,
        context,
        memento,
        storage,
      );
      TestGenerationPanel.currentPanel._testRecordNavigation = true;
    }

    if (!TestGenerationPanel.currentPanel._testRecordNavigation) {
      toast.showError('Cannot open other panels while running tests.');
      return;
    }

    if (typeof testID === 'string') {
      TestGenerationPanel.currentPanel.showTestRecord(testID);
      return;
    }

    TestGenerationPanel.currentPanel._msgQueue.enqueue({
      action: 'clear',
    });
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

  get historyUri() {
    return this._panel.webview.asWebviewUri(this._storage.getHistoryUri());
  }

  /**
   * Show the test record in the webview.
   */
  private showTestRecord(testID: string) {
    // const testRecord = this._memento.getTestIDs().find((id) => id === testID);
    const isValidId = this._memento.getTestIDs().some((id) => id === testID);
    if (!isValidId) {
      toast.showError('Unable to find test record.');
      return;
    }

    const testRecord = this._storage.getTestRecord(testID);

    this._msgQueue.enqueue({
      action: 'show-test-record',
      data: {
        testRecord,
        votes: this._storage.getVotes(testID),
      },
    });
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

          <script nonce="${nonce}">
            window.historyPath = '${this.historyUri.toString()}';
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private stopTestGeneration() {
    this._socket?.send(
      JSON.stringify({
        method: 'testgen.stop',
      }),
    );
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
      async (message: any) => {
        switch (message.action) {
          case 'ready':
            this._msgQueue.ready();
            break;
          case 'generate-test':
            try {
              this.askTestGenerationLLM(
                message.data.goal,
                message.data.app_name,
                message.data.max_test_steps,
                message.data.devices,
                message.data.platform,
                message.data.platform_version,
                message.data.assertions,
                '',
              );
            } catch (e) {
              this._msgQueue.enqueue({
                action: 'recover-from-error',
              });
              toast.showError(errMsg(e));
            }
            return;
          case 'stop-generation':
            this.stopTestGeneration();
            return;
          case 'save-steps': {
            await this.addRecordToHistory(message.data.test_id);
            return;
          }
          case 'enable-test-record-navigation':
            this._testRecordNavigation = true;
            return;
          case 'send-user-rating': {
            await this.sendUserRating(
              message.data.test_id,
              message.data.step,
              message.data.rating,
            );
            return;
          }
          case 'show-test-code': {
            const doc = await workspace.openTextDocument({
              content: message.data.content,
              language: message.data.language,
            });
            await window.showTextDocument(doc);
            return;
          }
          case 'open-job-url':
            await env.openExternal(Uri.parse(this.jobUrl(message.data.jobId)));
            return;
          case 'open-screenshot':
            await commands.executeCommand(
              'vscode.open',
              Uri.file(
                Uri.joinPath(
                  this._storage.getHistoryUri(),
                  message.data.testRecordId,
                  message.data.filename,
                ).path,
              ),
            );
            return;
        }
      },
      undefined,
      this._disposables,
    );
  }

  jobUrl(jobId: string) {
    const creds = this.getCredentials();
    if (!creds) {
      return '';
    }

    const { region } = creds;
    switch (region) {
      case 'eu-central-1':
        return `https://app.eu-central-1.saucelabs.com/tests/${jobId}`;
      default:
        return `https://app.saucelabs.com/tests/${jobId}`;
    }
  }

  public async addRecordToHistory(testID: string) {
    try {
      const history = this._memento.getTestIDs();

      if (history.includes(testID)) {
        console.log('Test record already in history');
        return;
      }

      if (history.length == MAX_HISTORY_LEN) {
        const removedRecord = history.pop();
        if (removedRecord) {
          this._storage.deleteTestRecord(removedRecord);
        }
      }
      history.unshift(testID);
      await this._memento.saveTestIDs(history);
    } catch (e) {
      toast.showError(`Failed to add test record to history: ${errMsg(e)}`);
    }

    executeUpdateHistoryLinksCommand(0);
  }

  private getCredentials(): Credentials | undefined {
    const creds = this._memento.getCredentials();
    if (!creds) {
      toast.showError('Please add your credentials!');
      return creds;
    }

    // executeClearHistoryLinkSelectionCommand();

    if (!creds.username) {
      toast.showError('Please add your Username!');
    }
    if (!creds.accessKey) {
      toast.showError('Please add your Access Key!');
    }
    if (!creds.region) {
      toast.showError('Please add your Region!');
    }

    return creds;
  }

  public async sendUserRating(
    testID: string,
    stepNumber: number,
    rating: string,
  ) {
    console.log(testID, stepNumber, rating);
    const testRecord = this._storage.getTestRecord(testID);
    const creds = this.getCredentials();
    if (!creds) {
      toast.showError('Failed to submit rating: No credentials.');
      return;
    }

    // Abort if the rated step is missing, indicating possible data corruption or incorrect operation.
    if (!Array.isArray(testRecord.all_steps)) {
      toast.showError(
        'Failed to submit rating: Test record lacks any test steps.',
      );
      return;
    }

    const step = testRecord.all_steps.find(
      (step) => step.step_num === stepNumber,
    );
    if (!step) {
      toast.showError(
        'Failed to submit rating: Step not found in test record.',
      );
      return;
    }

    const votes = this._storage.getVotes(testID);
    const vote = votes.find((f) => f.step_num === stepNumber);
    // Append the record if it is missing, then sort by step_num.
    // If the vote exists, locate and update it.
    if (!vote) {
      votes.push({
        rating: rating,
        step_num: stepNumber,
      });
      votes.sort((a, b) => a.step_num - b.step_num);
    } else {
      vote.rating = rating;
    }

    try {
      await sendUserRating(votes, testRecord.test_id, creds);
      this._storage.saveVotes(testID, votes);
    } catch (e) {
      toast.showError(`Failed to submit rating: ${errMsg(e)}.`);
    }
  }

  /**
   * Generate test using an LLM.
   */
  private askTestGenerationLLM(
    goal: string,
    appName: string,
    maxTestSteps: number,
    devices: string[],
    platform: Platform,
    platformVersion: string,
    assertions: string[],
    prevGoal: string,
  ) {
    const creds = this.getCredentials();
    // executeClearHistoryLinkSelectionCommand();
    goal = goal.trim();
    appName = appName.trim();

    if (!creds) {
      throw new Error(
        'Empty credentials detected. Please verify and update your configuration settings.',
      );
    }
    if (!goal) {
      throw new Error('No goal specified. Please add a goal.');
    }
    if (!appName) {
      throw new Error(
        'Application name is missing. Please specify an app filename.',
      );
    }

    // Notes: Temporary solution for validating the application name.
    // This check can be removed once a better method for retrieving the
    // application name is implemented, such as fetching an app list and
    // allowing selection from a dropdown menu.
    const androidFileEnding = /.+\.(apk|aab)$/;
    if (platform === 'Android' && !androidFileEnding.test(appName)) {
      throw new Error(
        'Invalid app filename. For Android, allowed file types are: apk, aab.',
      );
    }
    const iosFileEnding = /.+\.(ipa|app)$/;
    if (platform === 'iOS' && !iosFileEnding.test(appName)) {
      throw new Error(
        'Invalid app filename. For iOS, allowed file types are: ipa, app.',
      );
    }

    if (maxTestSteps < 1 || maxTestSteps > 20) {
      throw new Error(
        'Invalid number of test steps. Please enter a value between 1 and 20.',
      );
    }

    this._testRecordNavigation = false;

    const [ws, observable] = generateTest(
      this._storage,
      goal,
      appName,
      maxTestSteps,
      creds.username,
      creds.accessKey,
      creds.region,
      devices,
      platform,
      platformVersion,
      assertions,
      prevGoal,
      creds,
    );
    this._socket = ws;

    observable.subscribe({
      next: (data) => {
        let action = '';
        switch (data.type) {
          case 'com.saucelabs.scriptiq.testgen.status':
            action = 'update-test-progress';
            break;
          case 'com.saucelabs.scriptiq.testgen.job':
            action = 'show-video';
            break;
          case 'com.saucelabs.scriptiq.testgen.step':
            // FIXME it's treated like a status update; so why have it in the first place?
            action = 'update-test-progress';
            break;
          case 'com.saucelabs.scriptiq.testgen.record':
            action = 'show-new-test-record';
            break;
          case 'com.saucelabs.scriptiq.done':
            action = 'finalize';
            break;
          case 'com.saucelabs.scriptiq.stopped':
            action = 'finalize';
        }

        this._msgQueue.enqueue({
          action: action,
          credentials: creds,
          data: data.result,
        });
      },
      error: (err: Error) => {
        console.error(`Test generation failed: ${err}`);

        this._msgQueue.enqueue({
          action: 'recover-from-error',
        });
        toast.showError(errMsg(err));
      },
    });
  }
}

class MessageQueue {
  private _messages: any[];
  private _ready: boolean;
  private _webview: Webview;

  constructor(webview: Webview) {
    this._ready = false;
    this._messages = [];
    this._webview = webview;
  }

  enqueue(msg: any) {
    if (!this._ready) {
      this._messages.push(msg);
      return;
    }

    this._webview.postMessage(msg);
  }

  ready() {
    this._ready = true;

    this._messages.forEach((msg) => this._webview.postMessage(msg));
  }
}
