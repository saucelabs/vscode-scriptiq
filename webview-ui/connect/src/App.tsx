import React, { useCallback, useState } from 'react';
import {
  VSCodeButton,
  VSCodeTextField,
  VSCodeDropdown,
  VSCodeOption,
} from '@vscode/webview-ui-toolkit/react';

import { vscode } from './utilities/vscode';

function App() {
  let creds: Credentials = {
    username: '',
    accessKey: '',
    region: 'us-west-1',
  };
  try {
    const parsedCreds = JSON.parse(window.creds);
    if (
      parsedCreds &&
      typeof parsedCreds === 'object' &&
      'username' in parsedCreds &&
      'accessKey' in parsedCreds &&
      'region' in parsedCreds
    ) {
      creds = parsedCreds;
    }
  } catch {
    // NOTE: if the credentials can't be parsed just ignore and assume it is unset
  }

  const [username, setUsername] = useState(creds.username);
  const [accessKey, setAccessKey] = useState(creds.accessKey);
  const [region, setRegion] = useState(creds.region);

  const handleSave = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      vscode.postMessage({
        action: 'save-credentials',
        data: {
          username: username,
          accessKey: accessKey,
          region: region,
        },
      });
    },
    [username, accessKey, region],
  );

  return (
    <>
      <header>
        <p
          style={{
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          Create test scripts in minutes with the power of Sauce Labs AI.
        </p>
      </header>
      <main>
        <form
          id="credentials-form"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          onSubmit={handleSave}
        >
          <VSCodeTextField
            onInput={(e) => {
              if (e.target && 'value' in e.target) {
                setUsername(e.target.value as string);
              }
            }}
            value={username}
          >
            Sauce Username
          </VSCodeTextField>
          <VSCodeTextField
            onInput={(e) => {
              if (e.target && 'value' in e.target) {
                setAccessKey(e.target.value as string);
              }
            }}
            value={accessKey}
            type="password"
          >
            Sauce Access Key
          </VSCodeTextField>
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
              onChange={(e) => {
                console.log(e);
                if (e.target && 'value' in e.target) {
                  setRegion(e.target.value as string);
                }
              }}
              position="below"
              value={region}
            >
              <VSCodeOption selected={creds.region === 'us-west-1'}>
                us-west-1
              </VSCodeOption>
              <VSCodeOption selected={creds.region === 'eu-central-1'}>
                eu-central-1
              </VSCodeOption>
            </VSCodeDropdown>
          </section>
          <VSCodeButton
            style={{ width: '81px' }}
            type="submit"
            formId="credentials-form"
          >
            Save
          </VSCodeButton>
        </form>
      </main>
    </>
  );
}

export default App;
