import { useEffect, useReducer } from 'react';
import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';

import './App.css';
import { initialState, reducer } from './state';
import { vscode } from './utilities/vscode';
import { TestStep } from './TestStep';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    function handler(event: any) {
      const message = event.data; // The json data that the extension sent
      switch (message.action) {
        case 'update-test-progress':
          // setStatus(message.data.status_message);
          dispatch({
            type: 'setStatus',
            value: message.data.status_message,
          });
          break;
        case 'show-video': {
          // setStatus(message.data.status_message);
          // const { username, accessKey, region } = message.credentials;
          // startDeviceWebsocket(
          //   username,
          //   accessKey,
          //   region,
          //   message.data.session_id,
          // );
          break;
        }
        case 'show-test-record':
          // Append answer.
          // testHeader.style.display = 'block';
          // console.log('Reading in history');
          // console.log(message.data);

          // const testRecord = message.data?.testRecord ?? {};
          // const votes = message.data?.votes ?? [];
          // updateStepDataState(testRecord);
          // updateState('votes', votes);
          // generateFullTestDisplay();
          break;
        case 'show-new-test-record':
          // FIXME The difference between this and 'show-test-record' is confusing.
          // `show-test-record` is used to display the test record in the panel
          // when loading the test record from the history.
          // While `show-new-test-record` is the finished record that comes fresh
          // from the test generation process.
          // testGallery.innerHTML = '';
          // outputScript.innerHTML = '';
          vscode.postMessage({
            action: 'save-steps',
            data: message.data,
          });
          // updateStepDataState(message.data);
          // generateFullTestDisplay();
          break;
        case 'recover-from-error':
          // generateButton?.removeAttribute('disabled');
          // stopButton?.setAttribute('disabled', '');
          // // Retain the previous state, which may contain a useful error message
          // // or snapshot of the video.
          // vscode.postMessage({
          //   action: 'enable-test-record-navigation',
          // });
          // if (ws !== undefined) {
          //   ws.close();
          // }
          break;
        case 'finalize':
          // testGallery.innerHTML = '';
          // generateButton?.removeAttribute('disabled');
          // stopButton?.setAttribute('disabled', '');
          // vscode.postMessage({
          //   action: 'enable-test-record-navigation',
          // });
          // if (ws !== undefined) {
          //   ws.close();
          // }
          break;
        case 'clear':
          // clearScreen();
          break;
      }
    }

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, [dispatch]);

  const { appName, testGoal, maxSteps, platform, status } = state;

  const handleGenerateTest = () => {
    vscode.postMessage({
      action: 'generate-test',
      data: {
        goal: testGoal,
        app_name: appName,
        // assertions: assertInputDescs,
        assertions: [],
        max_test_steps: maxSteps,
        // devices: getSelectedDevices(),
        devices: ['Google.*'],
        platform: platform.name,
        platform_version: platform.version,
      },
    });
  };

  return (
    <main>
      <section className="inputs">
        <p>What do you want to test?</p>
        <VSCodeTextField
          value={appName}
          onInput={(e) => {
            if (e.target && 'value' in e.target) {
              dispatch({
                type: 'setAppName',
                value: e.target.value as string,
              });
            }
          }}
        >
          Application Name
        </VSCodeTextField>
        <VSCodeTextField
          value={testGoal}
          onInput={(e) => {
            if (e.target && 'value' in e.target) {
              dispatch({
                type: 'setTestGoal',
                value: e.target.value as string,
              });
            }
          }}
        >
          Test Goal
        </VSCodeTextField>
        <section className="inputs">
          <VSCodeTextField
            value={maxSteps.toString()}
            onInput={(e) => {
              if (e.target && 'value' in e.target) {
                // TODO: Value needs to be validated
                dispatch({
                  type: 'setMaxSteps',
                  value: parseInt(e.target.value as string),
                });
              }
            }}
          >
            Cut off steps at
          </VSCodeTextField>
          <section className="with-label">
            <label style={{ marginBottom: '2px' }}>Platform</label>
            <VSCodeDropdown
              onInput={(e) => {
                if (e.target && 'value' in e.target) {
                  dispatch({
                    type: 'setPlatformName',
                    value: e.target.value as 'iOS' | 'Android',
                  });
                }
              }}
              value={platform.name}
            >
              <VSCodeOption>Android</VSCodeOption>
              <VSCodeOption>iOS</VSCodeOption>
            </VSCodeDropdown>
          </section>
          <VSCodeTextField
            onInput={(e) => {
              if (e.target && 'value' in e.target) {
                dispatch({
                  type: 'setPlatformVersion',
                  value: e.target.value as string,
                });
              }
            }}
            value={platform.version}
          >
            Platform Version (optional)
          </VSCodeTextField>
          <section className="with-label">
            <label style={{ marginBottom: '2px' }}>
              Device Name (optional)
            </label>
            <VSCodeCheckbox>Google (any)</VSCodeCheckbox>
            <VSCodeCheckbox>Samsung (any)</VSCodeCheckbox>
          </section>
        </section>
        <section className="buttons">
          <VSCodeButton onClick={handleGenerateTest}>
            Generate Test
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            onClick={() => {
              dispatch({
                type: 'clear',
              });
            }}
          >
            Clear
          </VSCodeButton>
        </section>
      </section>
      <section className="status">{status}</section>
      {/* <section className="steps">
        <h5>Test Steps</h5>
        <TestStep />
      </section> */}
    </main>
  );
}

export default App;
