import { TestRecord } from './../../../src/types';
import './TestStep.css';

export function TestStep({ testRecord: _tr }: { testRecord?: TestRecord }) {
  return (
    <section className="test-step">
      <header>
        <div className="action-icon">Action Icon</div>
        <div className="title">Step 1</div>
        <div className="fullscreen">Fullscreen icon</div>
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
            <header>ScriptIQ Reasoning</header>
            <p className="goal">
              The goal is to skip logging in, find a plumber and then look at
              the reviews. The first step is to skip logging in.{' '}
            </p>
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
                <div className="description">
                  Home page with search bar and categories.
                </div>
                <div className="value">True</div>
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
        <section className="note">
          <header>
            <div className="icon">Info</div>
            <div>Note</div>
          </header>
          <p className="note">Script did not reach the end goal.</p>
        </section>
        <section className="controls">
          <button>View Test on Sauce</button>
          <button>Download Test Script</button>
        </section>
      </footer>
    </section>
  );
}
