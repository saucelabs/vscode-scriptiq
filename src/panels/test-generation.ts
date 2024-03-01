import * as vscode from 'vscode';
import {
  getNonce,
  getAsWebviewUri,
  getVSCodeUri,
} from '../utilities/utilities-service';
import {
  sendUserRating,
  askToTestGenerationAPIAsStream,
} from '../utilities/full-test-gen-api-service';
import { Store } from '../store';
import * as toast from '../toast';
import { TestRecord } from '../types';
import * as fs from 'node:fs';
import { GlobalStorage } from '../storage';

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
  public canOpenWindows: boolean = true;
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
    // this.imageDirPath = getAsWebviewUri(this.panel.webview, context.globalStorageUri, ['scriptiq_history']); // Also use name in utilities
    this.mediaPath = getAsWebviewUri(this.panel.webview, extensionUri, [
      'media',
    ]);
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
      if (!TestGenerationPanel.currentPanel.canOpenWindows) {
        toast.showError('Cannot open other panels while running tests.');
        return;
      }
      TestGenerationPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      if (testID) {
        TestGenerationPanel.currentPanel.showTestRecord(testID);
      } else {
        TestGenerationPanel.currentPanel.panel.webview.postMessage({
          command: 'clear',
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
          localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        },
      );

      const logoMainPath = getVSCodeUri(extensionUri, [
        'media',
        'icons',
        'Lowcode_icon_white.png',
      ]);
      panel.iconPath = {
        light: logoMainPath,
        dark: logoMainPath,
      };

      TestGenerationPanel.currentPanel = new TestGenerationPanel(
        context,
        panel,
        extensionUri,
      );
      TestGenerationPanel.currentPanel.canOpenWindows = true;

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
        const command = message.command;

        switch (command) {
          case 'press-generate-button':
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
              if (history[i].testID == message.data.testID) {
                console.log("Reloading history, don't save");
                return;
              }
            }
            if (history.length == MAX_HISTORY_LEN) {
              const removedRecord = history.pop();
              if (removedRecord) {
                this.storage.deleteTestRecord(removedRecord.testID);
              }
            }
            const newRecord: TestRecord = {
              goal: message.data.goal,
              apk: message.data.apk,
              testID: message.data.testID,
            };
            history.unshift(newRecord);
            this.store.saveHistory(history);
            vscode.commands.executeCommand('updateHistoryLinksNewTest.start');

            // Save the results in the to remove from machine
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(JSON.stringify(message.data));
            vscode.workspace.fs.writeFile(
              vscode.Uri.joinPath(
                extensionUri,
                'media',
                'data',
                message.data.testID + '.json',
              ),
              uint8Array,
            );
            vscode.workspace.fs.copy(
              this.storage.getHistoryUri(message.data.testID),
              vscode.Uri.joinPath(
                extensionUri,
                'media',
                'data',
                'screenshots',
                message.data.testID,
              ),
              { overwrite: true },
            );
            return;
          }
          case 'send-user-rating':
            sendUserRating(
              message.data.rating,
              message.data.step,
              message.data.test_record,
            );
            return;

          case 'edit-test-button':
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

          case 'copy-image':
            console.log(message.testID);
            if (this.testID !== message.testID) {
              console.log('REMOVE PREVIOUS IMAGE DIR!');
              this.removeImageDir();
            }
            console.log('COPY IN IMAGE DIR');
            vscode.workspace.fs.copy(
              this.storage.getHistoryUri(message.testID),
              vscode.Uri.joinPath(
                extensionUri,
                'media',
                'screenshots',
                message.testID,
              ),
              { overwrite: true },
            );
            this.testID = message.testID;
            console.log('copied');
            return;

          case 'can-open-window':
            this.canOpenWindows = true;
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
    const webviewUri = getAsWebviewUri(webview, extensionUri, [
      'media',
      'test-generation.js',
    ]);
    const nonce = getNonce();
    const styleVSCodeUri = getAsWebviewUri(webview, extensionUri, [
      'media',
      'vscode.css',
    ]);
    const logoMainPath = getAsWebviewUri(webview, extensionUri, [
      'media',
      'icons',
      'Lowcode_icon_black.png',
    ]);

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
    vscode.commands.executeCommand('clearHistoryLinkSelection.start');
    if (!creds) {
      return;
    } else if (goal === undefined || goal === null || goal === '') {
      toast.showError('Please add a Goal!');
    } else if (apk === undefined || apk === null || apk === '') {
      toast.showError('Please add an APK!');
    } else {
      const testID = this.getTestCandidateID();
      const dirURI = this.getTestDirURI(testID);
      this.canOpenWindows = false;
      askToTestGenerationAPIAsStream(
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
        dirURI,
        undefined,
        '',
        this.storage,
      ).subscribe((test) => {
        TestGenerationPanel.currentPanel?.panel.webview.postMessage({
          command: 'test',
          data: test,
        });
      });
    }
  }

  /**
   * Send APK and Goal to generate test using an LLM.
   */
  private askEditTestLLM(
    goal: string,
    apk: string,
    maxTestSteps: number,
    startActions: any,
    devices: Array<string>,
    platformVersion: string,
    prevGoal: string,
  ) {
    const creds = this.getCredentials();

    vscode.commands.executeCommand('clearHistoryLinkSelection.start');
    if (!creds) {
      return;
    } else if (goal === undefined || goal === null || goal === '') {
      toast.showError('Please add a Goal!');
    } else {
      const testID = this.getTestCandidateID();
      const dirURI = this.getTestDirURI(testID);
      askToTestGenerationAPIAsStream(
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
        dirURI,
        startActions,
        prevGoal,
        this.storage,
      ).subscribe((test) => {
        TestGenerationPanel.currentPanel?.panel.webview.postMessage({
          command: 'test',
          data: test,
        });
      });
    }
  }

  private getTestCandidateID() {
    return new Date().valueOf().toString();
  }

  private getTestDirURI(testID: string) {
    return this.storage.getHistoryUri(testID);
  }

  private getCredentials() {
    const creds = this.store.getCredentials();
    if (!creds) {
      toast.showError('Please add your credentials!');
      return creds;
    }

    vscode.commands.executeCommand('clearHistoryLinkSelection.start');

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
      .find((record) => record.testID === testID);
    if (!testRecord) {
      toast.showError('Unable to find test record.');
      return;
    }

    const jsonString = fs.readFileSync(
      this.storage.getHistoryUri(testID, 'data.json').path,
      'utf-8',
    );
    const testData = JSON.parse(jsonString);
    TestGenerationPanel.currentPanel?.panel.webview.postMessage({
      command: 'history',
      data: testData,
    });
  }

  /**
   * Remove dir of images for testID from media folder.
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