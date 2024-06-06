import type { TestStep as TestStepRecord } from './../../../src/types';
import { AppiumPython } from './codeGen/python';
import './TestStep.css';
import tapIconUrl from './icons/icn-gesture-tap-fill.svg';
import fullScreenIcon from './icons/icn-fullscreen-fill.svg';
import botIcon from './icons/icn-bot-fill.svg';
import { Assertion } from './state';
import { Screenshot } from './Screenshot';

export function TestStep({
  step,
  assertions,
  screen,
}: {
  step: TestStepRecord;
  assertions: Assertion[];
  screen?: { width: number; height: number };
}) {
  const codeGenerator = new AppiumPython();

  return (
    <section className="test-step">
      <header>
        <div className="action-icon">
          <img className="icon" src={tapIconUrl} />
        </div>
        <div className="title">Step {step.step_num + 1}</div>
        <div className="fullscreen">
          <img className="icon" src={fullScreenIcon} />
        </div>
      </header>
      <div className="body">
        {step.img_path && screen && (
          <section className="screenshot">
            <Screenshot
              src={step.img_path}
              width={screen.width}
              height={screen.height}
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
            </header>
            <div className="goal">{step.event_reason}</div>
            <ul className="screen-descriptions">
              {step.screen_descs.map((decs) => (
                <li>{decs}</li>
              ))}
            </ul>
          </section>
          {step.sd_asserts.length > 0 && assertions && (
            <section className="assertions">
              <header>Assertions</header>
              <ul>
                {assertions.map((assertion, i) => {
                  return (
                    <li>
                      <div>
                        <div className="description">{assertion.value}</div>
                        <div className="value">
                          {step.sd_asserts[i] ? 'true' : 'false'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {step.potential_identifiers.length > 0 && (
            <section className="command">
              <header>Command</header>
              <pre
                dangerouslySetInnerHTML={{
                  __html: codeGenerator.genCodeLine(
                    step.potential_identifiers[0],
                    step.action,
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
