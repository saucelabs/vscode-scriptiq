import { vscode } from './utilities/vscode';
import {
  VSCodeButton,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { useState } from 'react';

function App() {
  const [appName, setAppName] = useState('asdfasdfasfd');
  const [testGoal, setTestGoal] = useState('');

  const handleGenerateTest = () => {
    vscode.postMessage({});
  };

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '340px',
        rowGap: '8px',
      }}
    >
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
      <section>Assert Inputs Additional settings</section>
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
    </main>
  );
}

export default App;
