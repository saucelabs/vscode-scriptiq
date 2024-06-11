import { useEffect, useReducer } from 'react';
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeLink,
  VSCodeOption,
  VSCodeProgressRing,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';

import './App.scss';
import { initialState, reducer } from './state';
import { vscode } from './utilities/vscode';
import { TestStep } from './TestStep';
import { PostedMessage } from './types';
import { AssertionInput } from './AssertionInput';
import { Preview } from './Preview';
import chevronUpIcon from './icons/icn-chevron-up.svg';
import chevronDownIcon from './icons/icn-chevron-down.svg';
import { AppiumPython } from './codeGen/python';

const codeGenerator = new AppiumPython();

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
            value: {
              testRecord: message.data.testRecord,
              votes: message.data.votes,
            },
          });
          break;
        case 'show-new-test-record':
          vscode.postMessage({
            action: 'save-steps',
            data: message.data,
          });
          dispatch({
            type: 'loadNewRecord',
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
            type: 'finish',
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
        <h2>What do you want to test?</h2>
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
          <label>Assert Inputs (optional)</label>
          <div className="assertions">
            {assertions.map((assertion, i) => (
              <AssertionInput
                assertion={assertion}
                dispatch={dispatch}
                removable={i !== 0}
              />
            ))}
          </div>
        </section>
        <div className="additional-settings">
          <VSCodeLink
            onClick={() => dispatch({ type: 'toggleAdditionalSettings' })}
          >
            Additional Settings
          </VSCodeLink>
          <img
            className="icon"
            src={state.showAdditionalSettings ? chevronDownIcon : chevronUpIcon}
          />
        </div>

        {state.showAdditionalSettings && (
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
              <label>Platform</label>
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
              <label>Device Name (optional)</label>
              <div className="checkbox">
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
              <div className="checkbox">
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
        )}

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
                  assertions: assertions
                    .filter((a) => !!a.value)
                    .map((a) => a.value),
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
      state.generationState === 'errored' ||
      state.generationState === 'finishing' ? (
        <section className="updates">
          <div className="status">
            {status}
            <VSCodeProgressRing />
          </div>
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
                <TestStep dispatch={dispatch} step={step} />
              ))}
            </section>
            <footer>
              <section className="controls">
                {state.jobId && (
                  <VSCodeButton
                    appearance="primary"
                    onClick={() => {
                      vscode.postMessage({
                        action: 'open-job-url',
                        data: {
                          jobId: state.jobId,
                        },
                      });
                    }}
                  >
                    View Test on Sauce
                  </VSCodeButton>
                )}
                <VSCodeButton
                  appearance="secondary"
                  onClick={() => {
                    const code = codeGenerator.generateFullScript(
                      state.testGoal,
                      state.appName,
                      state.devices[0],
                      state.platform.version ?? '',
                      state.credentials?.region ?? '',
                      state.platform.name,
                      steps,
                    );

                    vscode.postMessage({
                      action: 'show-test-code',
                      data: {
                        content: code,
                        language: 'python',
                      },
                    });
                  }}
                >
                  Download Test Script
                </VSCodeButton>
              </section>
            </footer>
          </>
        )
      )}
    </main>
  );
}

export default App;
