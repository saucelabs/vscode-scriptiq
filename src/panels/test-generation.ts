import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { sendUserRating } from '../api/llm/http';
import { Memento } from '../memento';
import { generateTest } from '../api/llm/ws';
import * as toast from '../toast';
import { GlobalStorage } from '../storage';
import { errMsg } from '../error';
import { executeUpdateHistoryLinksCommand } from '../commands';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'undici';
import { Credentials, Platform } from '../types';

const MAX_HISTORY_LEN = 100;

/**
 * Webview panel class
 */
export class TestGenerationPanel {
  public static currentPanel: TestGenerationPanel | undefined;
  public extensionUri: vscode.Uri;
  // public imageDirPath: vscode.Uri;
  private readonly panel: vscode.WebviewPanel;
  private testID: string;
  private disposables: vscode.Disposable[] = [];
  private ctx: vscode.ExtensionContext;
  public testRecordNavigation: boolean = true;
  private memento: Memento;
  private storage: GlobalStorage;

  private socket: WebSocket | undefined;

  private constructor(
    context: vscode.ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
  ) {
    this.ctx = context;
    this.memento = memento;
    this.storage = storage;

    const extensionMediaUri = vscode.Uri.joinPath(
      context.extensionUri,
      'media',
    );
    this.panel = vscode.window.createWebviewPanel(
      'test-generation',
      'Ask ScriptIQ',
      vscode.ViewColumn.One,
      {
        // Enable javascript in the webview.
        enableScripts: true,
        // Restrict the webview to only load static resources (e.g. UI icons)
        // and history assets (e.g. screenshots)
        localResourceRoots: [extensionMediaUri, this.storage.getHistoryUri()],
      },
    );

    console.log(
      'Webview resource roots:',
      this.panel.webview.options.localResourceRoots?.map((root) => root.path),
    );

    const iconUri = vscode.Uri.joinPath(
      extensionMediaUri,
      'icons',
      'Lowcode_icon_white.png',
    );

    this.panel.iconPath = {
      light: iconUri,
      dark: iconUri,
    };
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.extensionUri = context.extensionUri;
    this.testID = '0';
    this.panel.webview.html = this.getWebviewContent(
      this.panel.webview,
      context.extensionUri,
    );
    this.subscribeToWebviewEvents(this.panel.webview);
  }

  /**
   * Render method of webview that is triggered from "extension.ts" file.
   */
  public static render(
    context: vscode.ExtensionContext,
    memento: Memento,
    storage: GlobalStorage,
    testID?: string,
  ) {
    if (!TestGenerationPanel.currentPanel) {
      // Create a new panel.
      TestGenerationPanel.currentPanel = new TestGenerationPanel(
        context,
        memento,
        storage,
      );
      TestGenerationPanel.currentPanel.testRecordNavigation = true;
    }

    if (!TestGenerationPanel.currentPanel.testRecordNavigation) {
      toast.showError('Cannot open other panels while running tests.');
      return;
    }

    TestGenerationPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);

    if (testID) {
      TestGenerationPanel.currentPanel.showTestRecord(testID);
      return;
    }

    TestGenerationPanel.currentPanel.panel.webview.postMessage({
      action: 'clear',
    });
  }

  /**
   * Dispose panel.
   */
  public dispose() {
    TestGenerationPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private stopTestGeneration() {
    this.socket?.send(
      JSON.stringify({
        method: 'testgen.stop',
      }),
    );
  }

  /**
   * Add listeners to catch messages from mainview js.
   */
  private subscribeToWebviewEvents(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        switch (message.action) {
          case 'stop-generation':
            this.stopTestGeneration();
            return;
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
              TestGenerationPanel.currentPanel?.panel.webview.postMessage({
                action: 'recover-from-error',
              });
              toast.showError(errMsg(e));
            }
            return;
          case 'save-steps': {
            await this.addRecordToHistory(message.data.test_id);
            return;
          }
          case 'send-user-rating': {
            await this.sendUserRating(
              message.data.test_id,
              message.data.step,
              message.data.rating,
            );
            return;
          }
          case 'enable-test-record-navigation':
            this.testRecordNavigation = true;
            return;
        }
      },
      undefined,
      this.disposables,
    );
  }

  /**
   * Returns HTML content of Webview panel.
   */
  private getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // get uris from out directory based on vscode.extensionUri
    const extensionMediaUri = vscode.Uri.joinPath(extensionUri, 'media');
    const webviewUri = webview.asWebviewUri(
      Uri.joinPath(extensionMediaUri, 'test-generation.js'),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(extensionMediaUri, 'vscode.css'),
    );
    const logoMainPath = webview.asWebviewUri(
      Uri.joinPath(extensionMediaUri, 'icons', 'Lowcode_icon_black.png'),
    );

    const mediaPath = webview.asWebviewUri(extensionMediaUri);
    const historyUri = webview.asWebviewUri(this.storage.getHistoryUri());

    const nonce = randomBytes(16).toString('base64');

    const slButtonUri = webview.asWebviewUri(
      Uri.joinPath(extensionMediaUri, 'sl-button/index.js'),
    );

    return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=DM+Mono">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=DM+Sans">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
            <link rel="icon" type="image/jpeg" href="${logoMainPath}">
            <script>
                var mediaPath = "${mediaPath}";
                var historyPath = "${historyUri}";
            </script>
            
          </head>
          <body>          
            <div class="form-container">
                <label for="app-name-text-id">Application filename</label>
                <input id="app-name-text-id" placeholder="e.g. test.apk" />				
            </div>
            <div class="form-container">
                <label for="goal-text-id">Your test goal</label>
                <input id="goal-text-id" placeholder="e.g. Skip logging in and add an item into the shopping cart"/>				
            </div>
            <label>Assert Inputs</label>
            <div id="assert-container" class="form-container">
                <br/>
            </div>
            <button type="button" id="add-screen-assert-button" class="button button-add-row">+</button>
            <button type="button" class="button button-text collapsible">
                Additional Settings <span class="collapsible-icon"></span>
            </button>
            <div class="additional-settings">
                <h6>Test limits</h6>
                <p>ScriptIQ likes to generate as many steps as it can. Help it to stay focused by telling it when it should stop.</p>
                <div class="form-container">
                    <label for="max_test_steps">Cut off test steps at</label>
                    <input type="number" class="short" id="max_test_steps" value="10" min="1" max="20" />
                </div>
                <h6 class="mt-30">Device Settings</h6>
                <div class="form-container dropdown-container">
                    <label for="device_platform">Device Platform</label>
                    <select name="device_platform" id="device_platform">
                    <option value="Android">Android</option>
                    <option value="iOS">iOS</option>
                  </select>
                </div>
                <br/>
                <div class="form-container">
                    <label for="platform_number">Platform Version</label>
                    <input type="text" class="short" id="platform_number" />
                </div>
                <label>Device Name</label>
                <div id="rdc-checkbox-container">
                </div>            
            </div>
            <div class="mt-30" style="display: flex; align-items: center; column-gap: 8px;">
              <sl-button id="generate-button-id" size="lg" color="primary">Generate</sl-button>
              <sl-button id="stop-button" size="lg" color="danger" disabled>Stop</sl-button>
              <button id="clear-button-id" class="button button-text">Clear</button>
            </div>
            <div id="test-header">
                <h5 class="mt-30">Generated Test</h5>  
                <div id="output-language-div" class="flex-container"> 
                </div>
            </div>
            <div id="gallery-container">           
            </div>          
            <div id="output-script-container">
            </div>
            <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
            <script type="text/javascript" src="${slButtonUri}"></script>
          </body>
        </html>
        `;
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

    this.testRecordNavigation = false;

    const [ws, observable] = generateTest(
      this.storage,
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
    this.socket = ws;

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

        TestGenerationPanel.currentPanel?.panel.webview.postMessage({
          action: action,
          credentials: creds,
          data: data.result,
        });
      },
      error: (err: Error) => {
        console.error(`Test generation failed: ${err}`);

        TestGenerationPanel.currentPanel?.panel.webview.postMessage({
          action: 'recover-from-error',
        });
        toast.showError(err.message);
      },
    });
  }

  private getCredentials(): Credentials | undefined {
    const creds = this.memento.getCredentials();
    if (!creds) {
      toast.showError('Please add your credentials!');
      return creds;
    }

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

  /**
   * Show the test record in the webview.
   */
  private showTestRecord(testID: string) {
    const testRecord = this.memento.getTestIDs().find((id) => id === testID);
    if (!testRecord) {
      toast.showError('Unable to find test record.');
      return;
    }

    TestGenerationPanel.currentPanel?.panel.webview.postMessage({
      action: 'show-test-record',
      data: {
        testRecord: this.storage.getTestRecord(testID),
        votes: this.storage.getVotes(testID),
      },
    });
  }

  public async addRecordToHistory(testID: string) {
    try {
      const history = this.memento.getTestIDs();

      if (history.includes(testID)) {
        console.log('Test record already in history');
        return;
      }

      if (history.length == MAX_HISTORY_LEN) {
        const removedRecord = history.pop();
        if (removedRecord) {
          this.storage.deleteTestRecord(removedRecord);
        }
      }
      history.unshift(testID);
      await this.memento.saveTestIDs(history);
    } catch (e) {
      toast.showError(`Failed to add test record to history: ${errMsg(e)}`);
    }

    executeUpdateHistoryLinksCommand(0);
  }

  public async sendUserRating(
    testID: string,
    stepNumber: number,
    rating: string,
  ) {
    const testRecord = this.storage.getTestRecord(testID);
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

    const votes = this.storage.getVotes(testID);
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
      this.storage.saveVotes(testID, votes);
    } catch (e) {
      toast.showError(`Failed to submit rating: ${errMsg(e)}.`);
    }
  }
}
