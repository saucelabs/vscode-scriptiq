import {
  VSCodeButton,
  VSCodeLink,
  VSCodeRadio,
} from '@vscode/webview-ui-toolkit/react';
import classNames from 'classnames';
import Prism from 'prismjs';

import { vscode } from './utilities/vscode';
import './TestStep.scss';
// import tapIconUrl from './icons/icn-gesture-tap-fill.svg';
import fullScreenIcon from './icons/icn-fullscreen-fill.svg';
import botIcon from './icons/icn-bot-fill.svg';
import thumbsUpIcon from './icons/icn-thumbs-up.svg';
import thumbsDownIcon from './icons/icn-thumbs-down.svg';
import { Action, Step } from './state';
import { Screenshot } from './Screenshot';
import { useEffect, useState } from 'react';

import chevronDownIcon from './icons/icn-chevron-down.svg';
import { AbstractBaseGenerator, AppiumJava, AppiumPython } from './codegen';

export function TestStep(props: {
  dispatch: React.Dispatch<Action>;
  language: 'python' | 'java';
  step: Step;
}) {
  const { dispatch, language, step } = props;
  const {
    testRecordId,
    screenshot,
    index,
    event_reason,
    assertionMatches,
    screen_descs,
    potential_identifiers,
    action,
    vote,
    actionMetadata,
  } = step;
  const [showAlternatives, setShowAlternatives] = useState<boolean>(false);
  const [selected, setSelected] = useState<number | 'skip'>(0);

  let codeGenerator: AbstractBaseGenerator = new AppiumJava();
  if (language === 'python') {
    codeGenerator = new AppiumPython();
  }

  const imgSrc = `${window.historyPath}/${testRecordId}/${screenshot.name}`;

  useEffect(() => {
    Prism.highlightAll();
  }, [language, showAlternatives]);

  return (
    <section className="test-step">
      <header>
        {/* <div className="action-icon">
          <img className="icon" src={tapIconUrl} />
        </div> */}
        <div className="title">Step {index + 1}</div>
        <div className="fullscreen">
          <VSCodeButton
            appearance="icon"
            aria-label="fullscreen"
            onClick={() => {
              vscode.postMessage({
                action: 'open-screenshot',
                data: {
                  testRecordId,
                  filename: screenshot.name,
                },
              });
            }}
          >
            <img
              className="icon button"
              src={fullScreenIcon}
              alt="Open image in full screen."
            />
          </VSCodeButton>
        </div>
      </header>
      <div className="body">
        {screenshot.name &&
          screenshot.width !== 0 &&
          screenshot.height !== 0 && (
            <section className="screenshot">
              <Screenshot
                src={imgSrc}
                width={screenshot.width}
                height={screenshot.height}
                annotation={screenshot.annotation}
              />
            </section>
          )}
        <section className="description">
          <section className="reasoning">
            <header>
              <div>
                <img
                  className="icon"
                  src={botIcon}
                  alt="Decorative Sauce Labs robot."
                />
              </div>
              <div>ScriptIQ Reasoning</div>
              <div className="ratings">
                <VSCodeButton appearance="icon" aria-label="like">
                  <img
                    className={classNames('rating', {
                      selected: vote === 'like',
                    })}
                    onClick={() => {
                      const newRating = vote === 'like' ? 'norating' : 'like';
                      dispatch({
                        type: 'vote',
                        value: {
                          index: step.index,
                          value: newRating,
                        },
                      });
                      vscode.postMessage({
                        action: 'send-user-rating',
                        data: {
                          rating: newRating,
                          step: index,
                          test_id: testRecordId,
                        },
                      });
                    }}
                    src={thumbsUpIcon}
                    alt="Positive feedback."
                  />
                </VSCodeButton>
                <VSCodeButton appearance="icon" aria-label="dislike">
                  <img
                    className={classNames('rating', {
                      selected: vote === 'dislike',
                    })}
                    onClick={() => {
                      const newRating =
                        vote === 'dislike' ? 'norating' : 'dislike';
                      dispatch({
                        type: 'vote',
                        value: {
                          index: index,
                          value: newRating,
                        },
                      });
                      vscode.postMessage({
                        action: 'send-user-rating',
                        data: {
                          rating: newRating,
                          step: index,
                          test_id: testRecordId,
                        },
                      });
                    }}
                    src={thumbsDownIcon}
                    alt="Negative feedback."
                  />
                </VSCodeButton>
              </div>
            </header>
            <div className="goal">{event_reason}</div>
            <ul className="screen-descriptions">
              {screen_descs.map((decs) => (
                <li>{decs}</li>
              ))}
            </ul>
          </section>
          {actionMetadata.text && (
            <section className="set-text-action">
              <header>Text Input</header>
              <div>{actionMetadata.text}</div>
            </section>
          )}
          {assertionMatches.length > 0 &&
            assertionMatches.every((item) => !!item.description) && (
              <section className="assertions">
                <header>Assertions</header>
                <ul>
                  {assertionMatches.map((match) => {
                    return (
                      <li>
                        <div>
                          <div className="description">{match.description}</div>
                          <div className="value">{match.value}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          {potential_identifiers.length > 0 && (
            <section className="commands">
              <header>Command</header>
              <div className="command">
                <VSCodeRadio
                  checked={selected === 0}
                  onClick={() => {
                    setSelected(0);
                    dispatch({
                      type: 'selectStepIdentifier',
                      value: {
                        stepIndex: step.index,
                        selectedIdentifier: 0,
                      },
                    });
                  }}
                >
                  <code className={`language-${language}`}>
                    {codeGenerator.genCodeLine(
                      potential_identifiers[0],
                      action,
                    )}
                  </code>
                </VSCodeRadio>
              </div>
              <section className="alternatives">
                <div className="toggle">
                  <VSCodeLink
                    onClick={() => {
                      setShowAlternatives(!showAlternatives);
                    }}
                  >
                    View Step Alternatives
                  </VSCodeLink>
                  <img
                    className={classNames('icon', {
                      up: !showAlternatives,
                    })}
                    src={chevronDownIcon}
                    alt="Show alternatives."
                  />
                </div>
                {showAlternatives && (
                  <div className="options">
                    <div className="command">
                      <VSCodeRadio
                        checked={selected === 'skip'}
                        onClick={() => {
                          setSelected('skip');
                          dispatch({
                            type: 'selectStepIdentifier',
                            value: {
                              stepIndex: step.index,
                              selectedIdentifier: 'skip',
                            },
                          });
                        }}
                      >
                        <code className={`language-${language}`}>
                          {codeGenerator.noOptionComment()}
                        </code>
                      </VSCodeRadio>
                    </div>
                    {potential_identifiers
                      .filter((_item, i) => i !== 0)
                      .map((item, i) => {
                        return (
                          <div className="command">
                            <VSCodeRadio
                              checked={selected === i + 1}
                              onClick={() => {
                                setSelected(i + 1);
                                dispatch({
                                  type: 'selectStepIdentifier',
                                  value: {
                                    stepIndex: step.index,
                                    selectedIdentifier: i + 1,
                                  },
                                });
                              }}
                            >
                              <code className={`language-${language}`}>
                                {codeGenerator.genCodeLine(item, action)}
                              </code>
                            </VSCodeRadio>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
