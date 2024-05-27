import { useState } from 'react';
import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';

import './App.css';
import { vscode } from './utilities/vscode';

function App() {
  const [appName, setAppName] = useState('');
  const [testGoal, setTestGoal] = useState('');

  const handleGenerateTest = () => {
    vscode.postMessage({
      action: '',
      data: {
        appName,
        testGoal,
      },
    });
  };

  return (
    <section className="inputs">
      <p>What do you want to test?</p>
      <VSCodeTextField
        value={appName}
        onInput={(e) => {
          if (e.target && 'value' in e.target) {
            setAppName(e.target.value as string);
          }
        }}
      >
        Application Name
      </VSCodeTextField>
      <VSCodeTextField
        value={testGoal}
        onInput={(e) => {
          if (e.target && 'value' in e.target) {
            setTestGoal(e.target.value as string);
          }
        }}
      >
        Test Goal
      </VSCodeTextField>
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <VSCodeTextField>Cut off steps at</VSCodeTextField>
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <label style={{ marginBottom: '2px' }}>Platform</label>
          <VSCodeDropdown>
            <VSCodeOption>Android</VSCodeOption>
            <VSCodeOption>iOS</VSCodeOption>
          </VSCodeDropdown>
        </section>
        <VSCodeTextField>Platform Version (optional)</VSCodeTextField>
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <label style={{ marginBottom: '2px' }}>Device Name (optional)</label>
          <VSCodeCheckbox>Google (any)</VSCodeCheckbox>
          <VSCodeCheckbox>Samsung (any)</VSCodeCheckbox>
        </section>
      </section>
      <section
        style={{
          display: 'flex',
          columnGap: '8px',
        }}
      >
        <VSCodeButton onClick={handleGenerateTest}>Generate Test</VSCodeButton>
        <VSCodeButton
          appearance="secondary"
          onClick={() => {
            setAppName('');
            setTestGoal('');
          }}
        >
          Clear
        </VSCodeButton>
      </section>
    </section>
  );
}

export default App;
