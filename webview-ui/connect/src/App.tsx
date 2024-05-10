// import { vscode } from './utilities/vscode';
import {
  VSCodeButton,
  VSCodeTextField,
  VSCodeDropdown,
  VSCodeOption,
} from '@vscode/webview-ui-toolkit/react';
import './App.css';

function App() {
  return (
    <>
      <header>
        <p
          style={{
            textAlign: 'center',
          }}
        >
          Create test scripts in minutes with the power of Sauce Labs AI.
          Connect to get started.
        </p>
      </header>
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <VSCodeTextField>Sauce Username</VSCodeTextField>
        <VSCodeTextField type="password">Sauce Access Key</VSCodeTextField>
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <label htmlFor="region-dropdown" style={{ marginBottom: '2px' }}>
            Sauce Labs Data Center
          </label>
          <VSCodeDropdown
            id="region-dropdown"
            position="below"
            style={{ width: '100%' }}
          >
            <VSCodeOption>us-west-1</VSCodeOption>
            <VSCodeOption>eu-central-1</VSCodeOption>
          </VSCodeDropdown>
        </section>
        <VSCodeButton>Connect</VSCodeButton>
      </main>
    </>
  );
}

export default App;
