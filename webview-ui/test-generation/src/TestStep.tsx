import { TestStep as TestStepRecord } from './../../../src/types';
import './TestStep.css';
import tapIconUrl from './icons/icn-gesture-tap-fill.svg';
import fullScreenIcon from './icons/icn-fullscreen-fill.svg';
import botIcon from './icons/icn-bot-fill.svg';

export function TestStep({ step }: { step: TestStepRecord }) {
  return (
    <section className="test-step">
      <header>
        <div className="action-icon">
          <img className="icon" src={tapIconUrl} />
        </div>
        <div className="title">Step 1</div>
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
            <div className="goal">
              The goal is to skip logging in, find a plumber and then look at
              the reviews. The first step is to skip logging in.
            </div>
            <ul className="screen-descriptions">
              <li>Sign up page.</li>
              <li>Yelp sign up page.</li>
              <li>Yelp sign up page with Google sign in option.</li>
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
          <section className="command">
            <header>Command</header>
            <pre className="appium-command">
              driver.find_element(by=AppiumBy.ID) value
              "com.yelp.android:id/skip_button").click
            </pre>
            <section className="alternatives">
              <a>View Step Alternatives</a>
            </section>
          </section>
        </section>
      </div>

      <footer>
        <section className="controls">
          <button>View Test on Sauce</button>
          <button>Download Test Script</button>
        </section>
      </footer>
    </section>
  );
}
