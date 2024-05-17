import React, { useCallback, useRef } from 'react';
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

  const handleSave = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();

    vscode.postMessage({
      action: 'save-credentials',
      data: {
        username: usernameRef.current?.value ?? '',
        accessKey: accessKeyRef.current?.value ?? '',
        region: regionRef.current?.value ?? '',
      },
    });
  }, []);

  const usernameRef = useRef<HTMLInputElement>(null);
  const accessKeyRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLSelectElement>(null);

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
          Connect to get started.
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
            // @ts-expect-error ref type is not correct for the generated component type
            ref={usernameRef}
            value={creds.username}
          >
            Sauce Username
          </VSCodeTextField>
          <VSCodeTextField
            // @ts-expect-error ref type is not correct for the generated component type
            ref={accessKeyRef}
            value={creds.accessKey}
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
              // @ts-expect-error ref type is not correct for the generated component type
              ref={regionRef}
              position="below"
              value={creds.region}
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
            Connect
          </VSCodeButton>
        </form>
      </main>
    </>
  );
}

export default App;
