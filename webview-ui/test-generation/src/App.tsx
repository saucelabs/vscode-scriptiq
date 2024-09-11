import { useEffect, useReducer, useState } from 'react';
import classNames from 'classnames';
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeLink,
  VSCodeOption,
  VSCodeProgressRing,
  VSCodeRadio,
  VSCodeTextArea,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';

import './App.scss';
import { initialState, reducer } from './state';
import { vscode } from './utilities/vscode';
import { TestStep } from './TestStep';
import { PostedMessage } from './types';
import { AssertionInput } from './AssertionInput';
import { Preview } from './Preview';
import { AbstractBaseGenerator, AppiumPython, AppiumJava } from './codegen';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);

  useEffect(() => {
    function handler(event: any) {
      const message = event.data as PostedMessage; // The json data that the extension sent

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
        case 'load-app-names':
          dispatch({
            type: 'loadAppNames',
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
    testGoal,
    maxSteps,
    platform,
    status,
    steps,
    tunnel,
    loadedAppInfo,
  } = state;

  const loadedAppNames: string[] = loadedAppInfo.map((map) => map.name);
  const appNameToPlatform = new Map<string, string>();
  loadedAppInfo.forEach((item) => appNameToPlatform.set(item.name, item.kind));
  let seenHistoryAppName = appName == ''; // if appName is empty, we don't need to add appName later
  const optionElements: JSX.Element[] = [];
  for (let i = 0; i < loadedAppNames.length; i++) {
    optionElements.push(<VSCodeOption>{loadedAppNames[i]}</VSCodeOption>);
    if (loadedAppNames[i] == appName) {
      seenHistoryAppName = true;
    }
  }
  if (!seenHistoryAppName) {
    optionElements.push(
      <VSCodeOption className="app-not-loaded">{appName}</VSCodeOption>,
    );
  }

  return (
    <main>
      <section className="inputs">
        <h2>What do you want to test?</h2>
        <section className="with-label">
          <label>App Name</label>
          <VSCodeDropdown
            onInput={(e) => {
              if (e.target && 'value' in e.target) {
                const appName: string = e.target.value as string;
                dispatch({
                  type: 'setAppName',
                  value: {
                    appName: appName as string,
                    platformName: appNameToPlatform.get(appName) as
                      | 'ios'
                      | 'android',
                  },
                });
              }
            }}
            value={appName}
            className={
              optionElements.some(
                (option) => option.props.className === 'app-not-loaded',
              )
                ? 'app-not-loaded'
                : ''
            }
          >
            {optionElements}
          </VSCodeDropdown>
        </section>
        <VSCodeTextArea
          resize="both"
          value={testGoal}
          placeholder="e.g. skip login and add an item into shopping cart"
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
        </VSCodeTextArea>
        <section className="with-label">
          <label>Assert Inputs (optional)</label>
          <div className="assertions">
            {assertions.map((assertion) => (
              <AssertionInput assertion={assertion} dispatch={dispatch} />
            ))}
          </div>
        </section>
        <div className="additional-settings">
          <VSCodeLink
            onClick={() => setShowAdditionalSettings(!showAdditionalSettings)}
          >
            Additional Settings
          </VSCodeLink>
          <span
            className={classNames('codicon', {
              'codicon-chevron-down': showAdditionalSettings,
              'codicon-chevron-right': !showAdditionalSettings,
            })}
          />
        </div>

        {showAdditionalSettings && (
          <section className="inputs">
            <VSCodeTextField
              placeholder="Sauce Connect tunnel name"
              onInput={(e) => {
                if (e.target && 'value' in e.target) {
                  dispatch({
                    type: 'setTunnelName',
                    value: e.target.value as string,
                  });
                }
              }}
              value={state.tunnel?.name ?? ''}
            >
              Tunnel Name (optional)
            </VSCodeTextField>
            <VSCodeTextField
              placeholder="Sauce Connect tunnel owner"
              onInput={(e) => {
                if (e.target && 'value' in e.target) {
                  dispatch({
                    type: 'setTunnelOwner',
                    value: e.target.value as string,
                  });
                }
              }}
              value={state.tunnel?.owner ?? ''}
            >
              Tunnel Owner (optional)
            </VSCodeTextField>
            <VSCodeTextField
              value={maxSteps.toString()}
              onInput={(e) => {
                if (e.target && 'value' in e.target) {
                  dispatch({
                    type: 'setMaxSteps',
                    value: e.target.value as string,
                  });
                }
              }}
              onChange={(e) => {
                if (e.target && 'value' in e.target && e.target.value === '') {
                  dispatch({
                    type: 'setMaxSteps',
                    value: '10',
                  });
                }
              }}
            >
              Cut off steps at
            </VSCodeTextField>
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
            <VSCodeTextField
              placeholder="e.g. Google.*, iPhone.*"
              onInput={(e) => {
                if (e.target && 'value' in e.target) {
                  dispatch({
                    type: 'setDevice',
                    value: e.target.value as string,
                  });
                }
              }}
              value={state.device ?? ''}
            >
              Device Name (optional)
            </VSCodeTextField>
            <div>
              <VSCodeLink href="https://docs.saucelabs.com/mobile-apps/supported-devices/#dynamic-device-allocation">
                Check the docs
              </VSCodeLink>{' '}
              to learn about device selection
            </div>
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
                    .filter((a) => a.value.replaceAll(/\s/g, '') !== '')
                    .map((a) => a.value),
                  max_test_steps: maxSteps,
                  devices: state.device ? [state.device] : [],
                  platform: platform.name,
                  platform_version: platform.version,
                  tunnel_name: tunnel?.name ?? '',
                  tunnel_owner: tunnel?.owner ?? '',
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
            {state.generationState === 'generating' && <VSCodeProgressRing />}
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
              <div>
                <VSCodeRadio
                  checked={state.language === 'python'}
                  onClick={() =>
                    dispatch({ type: 'setLanguage', value: 'python' })
                  }
                >
                  Python
                </VSCodeRadio>
                <VSCodeRadio
                  checked={state.language === 'java'}
                  onClick={() =>
                    dispatch({ type: 'setLanguage', value: 'java' })
                  }
                >
                  Java
                </VSCodeRadio>
              </div>
              {steps.map((step) => (
                <TestStep
                  key={`${step.testRecordId}-${step.index}`}
                  dispatch={dispatch}
                  language={state.language}
                  step={step}
                />
              ))}
            </section>
            <footer>
              <section className="controls">
                {state.job?.id && (
                  <VSCodeButton
                    appearance="primary"
                    onClick={() => {
                      vscode.postMessage({
                        action: 'open-job-url',
                        data: {
                          jobId: state.job?.id,
                        },
                      });
                    }}
                  >
                    View Test on Sauce
                  </VSCodeButton>
                )}
                {state.job &&
                  state.job.device &&
                  state.job.platform.version && (
                    <VSCodeButton
                      appearance="secondary"
                      onClick={() => {
                        let generator: AbstractBaseGenerator;
                        if (state.language === 'python') {
                          generator = new AppiumPython();
                        } else {
                          generator = new AppiumJava();
                        }
                        const code = generator.generateFullScript(
                          state.testGoal,
                          state.appName,
                          state.job?.device ?? '',
                          state.job?.platform.version ?? '',
                          state.region ?? '',
                          state.platform.name,
                          state.tunnel?.name ?? '',
                          state.tunnel?.owner ?? '',
                          steps,
                        );

                        vscode.postMessage({
                          action: 'show-test-code',
                          data: {
                            content: code,
                            language: state.language,
                          },
                        });
                      }}
                    >
                      Open Test Script
                    </VSCodeButton>
                  )}
              </section>
            </footer>
          </>
        )
      )}
    </main>
  );
}

export default App;
