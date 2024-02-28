import * as vscode from 'vscode';
import {
  getStoreData,
  setStoreData,
  getNonce,
  getAsWebviewUri,
  getVSCodeUri,
  getHistoryUri,
} from '../utilities/utilities-service';
import {
  sendUserRating,
  resendGeneratedTest,
  askToTestGenerationAPIAsStream,
} from '../utilities/full-test-gen-api-service';

const max_history_len = 100;

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
  private loadHistory: boolean = false;

  private constructor(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    loadHistory: boolean = false,
  ) {
    this.ctx = context;
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.loadHistory = loadHistory;

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
    this.setWebviewMessageListener(this.panel.webview, extensionUri);
  }

  /**
   * Render method of webview that is triggered from "extension.ts" file.
   */
  public static render(
    context: vscode.ExtensionContext,
    loadHistory: boolean = false,
  ) {
    // if exist show
    if (TestGenerationPanel.currentPanel) {
      if (!TestGenerationPanel.currentPanel.canOpenWindows) {
        const responseMessage = `Cannot open other panels while test running.`;
        vscode.window.showInformationMessage(responseMessage);
        return;
      }
      TestGenerationPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      if (loadHistory) {
        TestGenerationPanel.currentPanel.reloadHistoryInstance();
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
        loadHistory,
      );
      TestGenerationPanel.currentPanel.canOpenWindows = true;

      if (loadHistory) {
        TestGenerationPanel.currentPanel.reloadHistoryInstance();
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
  private setWebviewMessageListener(
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
            let historyList = getStoreData(this.ctx, 'history');
            for (let x = 0; x < historyList.length; x++) {
              if (historyList[x].testID == message.data.testID) {
                console.log("Reloading history, don't save");
                return;
              }
            }
            if (historyList.length == max_history_len) {
              const removed_test = historyList.pop();
              vscode.workspace.fs.delete(
                getHistoryUri(this.ctx, [removed_test.testID]),
                { recursive: true },
              );
            }
            const newHistory = {
              goal: message.data.goal,
              apk: message.data.apk,
              testID: message.data.testID,
            };
            historyList = [newHistory].concat(historyList);
            setStoreData(this.ctx, historyList, 'history');
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
              getHistoryUri(this.ctx, [message.data.testID]),
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
              getHistoryUri(this.ctx, [message.testID]),
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
      'full-test-gen.js',
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
    const [credentialsAvailable, sauceUsername, sauceAccessKey, data_center] =
      this.accessSauceCredentials();
    vscode.commands.executeCommand('clearHistoryLinkSelection.start');
    if (!credentialsAvailable) {
      return;
    } else if (goal === undefined || goal === null || goal === '') {
      vscode.window.showInformationMessage('Please add a Goal!');
    } else if (apk === undefined || apk === null || apk === '') {
      vscode.window.showInformationMessage('Please add an APK!');
    } else {
      const testID = this.getTestCandidateID();
      const dirURI = this.getTestDirURI(testID);
      const outputFileURI = this.getTestDataFileURI(testID);
      this.canOpenWindows = false;
      askToTestGenerationAPIAsStream(
        goal,
        apk,
        maxTestSteps,
        sauceUsername,
        sauceAccessKey,
        data_center,
        devices,
        platformVersion,
        assertions,
        testID,
        dirURI,
        outputFileURI,
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
    const [credentialsAvailable, sauceUsername, sauceAccessKey, data_center] =
      this.accessSauceCredentials();

    vscode.commands.executeCommand('clearHistoryLinkSelection.start');
    if (!credentialsAvailable) {
      return;
    } else if (goal === undefined || goal === null || goal === '') {
      vscode.window.showInformationMessage('Please add a Goal!');
    } else {
      const testID = this.getTestCandidateID();
      const dirURI = this.getTestDirURI(testID);
      const outputFileURI = this.getTestDataFileURI(testID);
      askToTestGenerationAPIAsStream(
        goal,
        apk,
        maxTestSteps,
        sauceUsername,
        sauceAccessKey,
        data_center,
        devices,
        platformVersion,
        [],
        testID,
        dirURI,
        outputFileURI,
        startActions,
        prevGoal,
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
    return getHistoryUri(this.ctx, [testID]);
  }

  private getTestDataFileURI(testID: string) {
    return getHistoryUri(this.ctx, [testID, 'data.json']);
  }

  private accessSauceCredentials() {
    const storeData = getStoreData(this.ctx, 'sauce_api');
    let credentialsAvailable = true;
    let sauceUsername, sauceAccessKey, data_center;
    if (storeData === undefined) {
      vscode.window.showInformationMessage('Please add your credentials!');
      credentialsAvailable = false;
    } else {
      sauceUsername = storeData.sauceUsername;
      sauceAccessKey = storeData.sauceAccessKey;
      data_center = storeData.data_center;

      vscode.commands.executeCommand('clearHistoryLinkSelection.start');

      if (
        sauceUsername === undefined ||
        sauceUsername === null ||
        sauceUsername === ''
      ) {
        vscode.window.showInformationMessage('Please add your Username!');
        credentialsAvailable = false;
      } else if (
        sauceAccessKey === undefined ||
        sauceAccessKey === null ||
        sauceAccessKey === ''
      ) {
        vscode.window.showInformationMessage('Please add your Access Key!');
        credentialsAvailable = false;
      } else if (
        data_center === undefined ||
        data_center === null ||
        data_center === ''
      ) {
        vscode.window.showInformationMessage('Please add your Data Center!');
        credentialsAvailable = false;
      }
    }
    return [credentialsAvailable, sauceUsername, sauceAccessKey, data_center];
  }

  /**
   * Reload history instance.
   */
  private reloadHistoryInstance() {
    const currHistory = getStoreData(this.ctx, 'curr_history');
    const storeData = getStoreData(this.ctx, 'history')[currHistory];
    if (storeData === undefined || storeData === null || storeData === '') {
      vscode.window.showInformationMessage(
        'Please run a test before reloading!',
      );
    } else {
      console.log(storeData);
      resendGeneratedTest(storeData, getHistoryUri(this.ctx, [])).subscribe(
        (test) => {
          TestGenerationPanel.currentPanel?.panel.webview.postMessage({
            command: 'history',
            data: test,
          });
        },
      );
    }
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
