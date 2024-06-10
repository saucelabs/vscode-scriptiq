import { useEffect, useReducer } from 'react';
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';

import './App.css';
import { initialState, reducer } from './state';
import { vscode } from './utilities/vscode';
import { TestStep } from './TestStep';
import { PostedMessage } from './types';
import { AssertionInput } from './AssertionInput';
import { Preview } from './Preview';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    function handler(event: any) {
      const message = event.data as PostedMessage; // The json data that the extension sent
      console.log(message);
      switch (message.action) {
        case 'update-test-progress':
          dispatch({
            type: 'setStatus',
            value: message.data.status_message,
          });
          break;
        case 'show-video': {
          dispatch({
            type: 'showVideo',
            value: {
              sessionId: message.data.session_id,
              status: message.data.status_message,
              credentials: message.credentials,
            },
          });
          break;
        }
        case 'show-test-record':
          dispatch({
            type: 'showTestRecord',
            value: message.data.testRecord,
          });
          break;
        case 'show-new-test-record':
          // FIXME The difference between this and 'show-test-record' is confusing.
          // `show-test-record` is used to display the test record in the panel
          // when loading the test record from the history.
          // While `show-new-test-record` is the finished record that comes fresh
          // from the test generation process.
          vscode.postMessage({
            action: 'save-steps',
            data: message.data,
          });
          dispatch({
            type: 'showTestRecord',
            value: message.data,
          });
          break;
        case 'recover-from-error':
          dispatch({
            type: 'setGenerationState',
            value: 'errored',
          });
          // Retain the previous state, which may contain a useful error message
          // or snapshot of the video.
          vscode.postMessage({
            action: 'enable-test-record-navigation',
          });
          break;
        case 'finalize':
          dispatch({
            type: 'setGenerationState',
            value: 'succeeded',
          });
          vscode.postMessage({
            action: 'enable-test-record-navigation',
          });
          break;
        case 'clear':
          dispatch({
            type: 'clear',
          });
          break;
      }
    }

    window.addEventListener('message', handler);

    return () => {
      window.removeEventListener('message', handler);
    };
  }, [dispatch]);

  useEffect(() => {
    vscode.postMessage({
      action: 'ready',
    });
  }, []);

  const {
    appName,
    assertions,
    devices,
    testGoal,
    maxSteps,
    platform,
    status,
    steps,
  } = state;

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
        <section className="with-label">
          <label style={{ marginBottom: '2px' }}>
            Assert Inputs (optional)
          </label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              rowGap: '8px',
            }}
          >
            {assertions.map((assertion) => (
              <AssertionInput assertion={assertion} dispatch={dispatch} />
            ))}
          </div>
        </section>
        <section className="inputs">
          <VSCodeTextField
            value={maxSteps?.toString() ?? '10'}
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
            <div style={{ display: 'flex', columnGap: '10px' }}>
              <input
                type="checkbox"
                checked={devices.includes('Google.*')}
                onChange={(e) => {
                  if (e.target && 'value' in e.target) {
                    dispatch({
                      type: 'toggleDevice',
                      value: e.target.value as string,
                    });
                  }
                }}
                value="Google.*"
              />
              <label>Google (any)</label>
            </div>
            <div style={{ display: 'flex', columnGap: '10px' }}>
              <input
                type="checkbox"
                checked={devices.includes('Samsung.*')}
                onChange={(e) => {
                  if (e.target && 'value' in e.target) {
                    dispatch({
                      type: 'toggleDevice',
                      value: e.target.value as string,
                    });
                  }
                }}
                value="Samsung.*"
              />
              <label>Samsung (any)</label>
            </div>
          </section>
        </section>
        <section className="buttons">
          <VSCodeButton
            disabled={state.generationState === 'generating'}
            onClick={() => {
              dispatch({
                type: 'startGeneration',
              });
              vscode.postMessage({
                action: 'generate-test',
                data: {
                  goal: testGoal,
                  app_name: appName,
                  assertions: [],
                  max_test_steps: maxSteps,
                  devices: devices,
                  platform: platform.name,
                  platform_version: platform.version,
                },
              });
            }}
          >
            Generate Test
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            disabled={state.generationState !== 'generating'}
            onClick={() => {
              dispatch({
                type: 'stopGeneration',
              });
              vscode.postMessage({
                action: 'stop-generation',
                data: {},
              });
            }}
          >
            Cancel
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
      {state.generationState === 'generating' ||
      state.generationState === 'errored' ? (
        <section className="updates">
          <div className="status">{status}</div>
          {state.credentials && state.sessionId && (
            <Preview
              credentials={state.credentials}
              isLive={state.generationState === 'generating'}
              sessionId={state.sessionId}
            />
          )}
        </section>
      ) : (
        steps && (
          <>
            <section className="steps">
              <h3>Test Steps</h3>
              {steps.map((step) => (
                <TestStep
                  step={step}
                  recordId={state.testId ?? ''}
                  assertions={assertions}
                  screen={state.screen}
                />
              ))}
            </section>
            <footer>
              <section className="controls">
                <button>View Test on Sauce</button>
                <button>Download Test Script</button>
              </section>
            </footer>
          </>
        )
      )}
    </main>
  );
}

export default App;
