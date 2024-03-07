import * as vscode from 'vscode';
import { sendUserRating, generateTest } from '../http/scriptiq-llm';
import { Store } from '../store';
import * as toast from '../toast';
import { TestRecord } from '../types';
import { GlobalStorage } from '../storage';
import {
  executeClearHistoryLinkSelectionCommand,
  executeUpdateHistoryLinksCommand,
} from '../commands';
import { randomBytes, randomUUID } from 'node:crypto';
import { Uri } from 'vscode';

const MAX_HISTORY_LEN = 100;

/**
 * Webview panel class
 */
export class TestGenerationPanel {
  public static currentPanel: TestGenerationPanel | undefined;
  public extensionUri: vscode.Uri;
  // public imageDirPath: vscode.Uri;
  public mediaPath: vscode.Uri;
  private readonly panel: vscode.WebviewPanel;
  private testID: string;
  private disposables: vscode.Disposable[] = [];
  private ctx: vscode.ExtensionContext;
  public testRecordNavigation: boolean = true;
  private store: Store;
  private storage: GlobalStorage;

  private constructor(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
  ) {
    this.ctx = context;
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.store = new Store(context.globalState);
    this.storage = new GlobalStorage(context.globalStorageUri);

    this.extensionUri = extensionUri;
    this.mediaPath = this.panel.webview.asWebviewUri(
      Uri.joinPath(extensionUri, 'media'),
    );
    this.testID = '0';
    this.panel.webview.html = this.getWebviewContent(
      this.panel.webview,
      extensionUri,
    );
    this.subscribeToWebviewEvents(this.panel.webview, extensionUri);
  }

  /**
   * Render method of webview that is triggered from "extension.ts" file.
   */
  public static render(context: vscode.ExtensionContext, testID?: string) {
    // if exist show
    if (TestGenerationPanel.currentPanel) {
      if (!TestGenerationPanel.currentPanel.testRecordNavigation) {
        toast.showError('Cannot open other panels while running tests.');
        return;
      }
      TestGenerationPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      if (testID) {
        TestGenerationPanel.currentPanel.showTestRecord(testID);
      } else {
        TestGenerationPanel.currentPanel.panel.webview.postMessage({
          action: 'clear',
        });
      }
    } else {
      // if not exist create a new one.
      const extensionUri: vscode.Uri = context.extensionUri;
      const panel = vscode.window.createWebviewPanel(
        'test-generation',
        'Ask ScriptIQ',
        vscode.ViewColumn.One,
        {
          // Enable javascript in the webview.
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` directory.
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media'),
            vscode.Uri.joinPath(context.globalStorageUri, 'scriptiq_history'),
          ],
        },
      );

      const logoMainPath = vscode.Uri.joinPath(
        extensionUri,
        'media',
        'icons',
        'Lowcode_icon_white.png',
      );

      panel.iconPath = {
        light: logoMainPath,
        dark: logoMainPath,
      };

      TestGenerationPanel.currentPanel = new TestGenerationPanel(
        context,
        panel,
        extensionUri,
      );
      TestGenerationPanel.currentPanel.testRecordNavigation = true;

      if (testID) {
        TestGenerationPanel.currentPanel.showTestRecord(testID);
      }
    }
  }

  /**
   * Dispose panel.
   */
  public dispose() {
    TestGenerationPanel.currentPanel?.removeImageDir();
    TestGenerationPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Add listeners to catch messages from mainview js.
   */
  private subscribeToWebviewEvents(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const action = message.action;

        switch (action) {
          case 'generate-test':
            this.askTestGenerationLLM(
              message.data.goal,
              message.data.apk,
              message.data.max_test_steps,
              message.data.devices,
              message.data.platform_version,
              message.data.assertions,
            );
            return;
          case 'save-steps': {
            const history = this.store.getHistory();
            for (let i = 0; i < history.length; i++) {
              if (history[i].test_id == message.data.test_id) {
                console.log("Reloading history, don't save");
                return;
              }
            }
            if (history.length == MAX_HISTORY_LEN) {
              const removedRecord = history.pop();
              if (removedRecord) {
                this.storage.deleteTestRecord(removedRecord.test_id);
              }
            }
            const newRecord: TestRecord = {
              goal: message.data.goal,
              apk: message.data.apk,
              test_id: message.data.test_id,
            };
            history.unshift(newRecord);
            this.store.saveHistory(history);

            executeUpdateHistoryLinksCommand(0);

            // Save the results in the to remove from machine
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(JSON.stringify(message.data));
            vscode.workspace.fs.writeFile(
              vscode.Uri.joinPath(
                extensionUri,
                'media',
                'data',
                message.data.test_id + '.json',
              ),
              uint8Array,
            );
            vscode.workspace.fs.copy(
              this.storage.getHistoryUri(message.data.test_id),
              vscode.Uri.joinPath(
                extensionUri,
                'media',
                'data',
                'screenshots',
                message.data.test_id,
              ),
              { overwrite: true },
            );
            return;
          }
          case 'send-user-rating': {
            const testRecord = this.storage.getTestRecord(message.data.test_id);
            sendUserRating(message.data.rating, message.data.step, testRecord);
            return;
          }

          case 'generate-edited-test':
            this.askEditTestLLM(
              message.data.goal,
              message.data.apk,
              message.data.max_test_steps,
              message.data.start_actions,
              message.data.devices,
              message.data.platform_version,
              message.data.prev_goal,
            );
            return;
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
    const webviewUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, 'media', 'test-generation.js'),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, 'media', 'vscode.css'),
    );
    const logoMainPath = webview.asWebviewUri(
      Uri.joinPath(extensionUri, 'media', 'icons', 'Lowcode_icon_black.png'),
    );

    const historyUri = webview.asWebviewUri(this.storage.getHistoryUri());

    const nonce = randomBytes(16).toString('base64');

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
                var mediaPath = "${this.mediaPath}";
                var historyPath = "${historyUri}";
            </script>
          </head>
          <body>          
            <div class="form-container">
                <label for="apk-text-id">Application filename (APK)</label>
                <input id="apk-text-id" placeholder="e.g. test.apk" />				
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
                    <input type="number" class="short" id="max_test_steps" value="10" />
                </div>
                <h6 class="mt-30">Device Settings</h6>
                <div class="form-container">
                    <label for="device_platform">Device Platform (Android only)</label>
                    <input id="device_platform" value="Android" readonly/>
                </div>
                <div class="form-container">
                    <label for="platform_number">Platform Version</label>
                    <input type="text" class="short" id="platform_number" />
                </div>
                <label>Device Name</label>
                <div id="rdc-checkbox-container">
                </div>            
            </div>
            <div class="mt-30">
              <button id="generate-button-id" class="button button-primary button-large">Generate</button>
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
          </body>
        </html>
        `;
  }

  /**
   * Send APK and Goal to generate test using an LLM.
   */
  private askTestGenerationLLM(
    goal: string,
    apk: string,
    maxTestSteps: number,
    devices: Array<string>,
    platformVersion: string,
    assertions: Array<string>,
  ) {
    const creds = this.getCredentials();
    executeClearHistoryLinkSelectionCommand();

    if (!creds) {
      return;
    }
    if (!goal) {
      toast.showError('Please add a Goal!');
      return;
    }
    if (!apk) {
      toast.showError('Please add an APK!');
      return;
    }

    const testID = this.createTestRecordID();
    this.testRecordNavigation = false;
    generateTest(
      this.storage,
      goal,
      apk,
      maxTestSteps,
      creds.username,
      creds.accessKey,
      creds.region,
      devices,
      platformVersion,
      assertions,
      testID,
      [],
      '',
    ).subscribe((test) => {
      TestGenerationPanel.currentPanel?.panel.webview.postMessage({
        action: 'update-test-progress',
        data: test,
      });
    });
  }

  /**
   * Send APK and Goal to generate test using an LLM.
   */
  private askEditTestLLM(
    goal: string,
    apk: string,
    maxTestSteps: number,
    startActions: string[],
    devices: string[],
    platformVersion: string,
    prevGoal: string,
  ) {
    const creds = this.getCredentials();
    executeClearHistoryLinkSelectionCommand();

    if (!creds) {
      return;
    }
    if (!goal) {
      toast.showError('Please add a Goal!');
      return;
    }

    const testID = this.createTestRecordID();
    generateTest(
      this.storage,
      goal,
      apk,
      maxTestSteps,
      creds.username,
      creds.accessKey,
      creds.region,
      devices,
      platformVersion,
      [],
      testID,
      startActions,
      prevGoal,
    ).subscribe((test) => {
      TestGenerationPanel.currentPanel?.panel.webview.postMessage({
        action: 'update-test-progress',
        data: test,
      });
    });
  }

  private createTestRecordID() {
    return randomUUID().replaceAll('-', '');
  }

  private getCredentials() {
    const creds = this.store.getCredentials();
    if (!creds) {
      toast.showError('Please add your credentials!');
      return creds;
    }

    executeClearHistoryLinkSelectionCommand();

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
    const testRecord = this.store
      .getHistory()
      .find((record) => record.test_id === testID);
    if (!testRecord) {
      toast.showError('Unable to find test record.');
      return;
    }

    TestGenerationPanel.currentPanel?.panel.webview.postMessage({
      action: 'show-test-record',
      data: this.storage.getTestRecord(testID),
    });
  }

  /**
   * Remove dir of images for test_id from media folder.
   */
  private removeImageDir() {
    if (this.testID !== '0') {
      vscode.workspace.fs.delete(
        vscode.Uri.joinPath(
          this.extensionUri,
          'media',
          'screenshots',
          this.testID,
        ),
        { recursive: true },
      );
    }
  }
}
