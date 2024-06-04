import type { TestStep as TestStepRecord } from './../../../src/types';
import { AppiumPython } from './codeGen/python';
import './TestStep.css';
import tapIconUrl from './icons/icn-gesture-tap-fill.svg';
import fullScreenIcon from './icons/icn-fullscreen-fill.svg';
import botIcon from './icons/icn-bot-fill.svg';

export function TestStep({ step }: { step: TestStepRecord }) {
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
        <section className="screenshot">
          <div
            style={{
              backgroundColor: 'salmon',
              width: '120px',
              height: '200px',
            }}
          />
        </section>
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
          <section className="assertions">
            <header>Assertions</header>
            <ul>
              <li>
                <div>
                  <div className="description">
                    Home page with search bar and categories.
                  </div>
                  <div className="value">True</div>
                </div>
              </li>
            </ul>
          </section>
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
