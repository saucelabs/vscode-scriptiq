import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import classNames from 'classnames';

import { AppiumPython } from './codeGen/python';
import './TestStep.css';
import tapIconUrl from './icons/icn-gesture-tap-fill.svg';
import fullScreenIcon from './icons/icn-fullscreen-fill.svg';
import botIcon from './icons/icn-bot-fill.svg';
import thumbsUpIcon from './icons/icn-thumbs-up.svg';
import thumbsDownIcon from './icons/icn-thumbs-down.svg';
import { Assertion } from './state';
import { Screenshot } from './Screenshot';

import classes from './TestStep.module.css';

export function TestStep(props: {
  assertions: Assertion[];
  step: {
    index: number;
    testRecordId: string;
    action: string;
    screenshot: {
      name: string;
      width: number;
      height: number;
      annotation: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
    potential_identifiers: {
      type: string;
      value: string;
      index: number;
      checked: boolean;
      depth: number;
    }[];
    event_reason: string;
    // TODO: Normalize assertions
    screen_descs: string[];
    sd_asserts: string[];
    vote?: string;
  };
}) {
  const { assertions, step } = props;
  const {
    testRecordId,
    screenshot,
    index,
    event_reason,
    sd_asserts,
    screen_descs,
    potential_identifiers,
    action,
    vote,
  } = step;
  const codeGenerator = new AppiumPython();

  const imgSrc = `${window.historyPath}/${testRecordId}/${screenshot.name}`;

  return (
    <section className="test-step">
      <header>
        <div className="action-icon">
          <img className="icon" src={tapIconUrl} />
        </div>
        <div className="title">Step {index + 1}</div>
        <div className="fullscreen">
          <img className="icon" src={fullScreenIcon} />
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
                <img className="icon" src={botIcon} />
              </div>
              <div>ScriptIQ Reasoning</div>
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  columnGap: '2px',
                }}
              >
                <VSCodeButton appearance="icon" aria-label="like">
                  <img
                    className={classNames(classes.rating, {
                      [classes.selected]: vote === 'like',
                    })}
                    src={thumbsUpIcon}
                  />
                </VSCodeButton>
                <VSCodeButton appearance="icon" aria-label="dislike">
                  <img
                    className={classNames(classes.rating, {
                      [classes.selected]: vote === 'dislike',
                    })}
                    src={thumbsDownIcon}
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
          {sd_asserts.length > 0 && assertions && (
            <section className="assertions">
              <header>Assertions</header>
              <ul>
                {assertions.map((assertion, i) => {
                  return (
                    <li>
                      <div>
                        <div className="description">{assertion.value}</div>
                        <div className="value">
                          {sd_asserts[i] ? 'true' : 'false'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {potential_identifiers.length > 0 && (
            <section className="command">
              <header>Command</header>
              <pre
                dangerouslySetInnerHTML={{
                  __html: codeGenerator.genCodeLine(
                    potential_identifiers[0],
                    action,
                  ),
                }}
                className="appium-command"
              />
              <section className="alternatives">
                <a>View Step Alternatives</a>
              </section>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
