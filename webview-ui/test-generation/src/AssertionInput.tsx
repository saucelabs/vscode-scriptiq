import {
  VSCodeButton,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { Action, Assertion } from './state';

interface AssertionInputProps {
  dispatch: React.Dispatch<Action>;
  assertion: Assertion;
}

export function AssertionInput(props: AssertionInputProps) {
  const { dispatch, assertion } = props;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        columnGap: '8px',
      }}
    >
      <VSCodeTextField
        onInput={(e) => {
          if (e.target && 'value' in e.target) {
            dispatch({
              type: 'setAssertionValue',
              value: {
                key: assertion.key,
                value: e.target.value as string,
              },
            });
          }
        }}
        placeholder="e.g. Number of items in the cart should be 1"
        style={{
          width: '100%',
        }}
        value={assertion.value ?? ''}
      ></VSCodeTextField>
      <VSCodeButton
        appearance="icon"
        aria-label="Delete"
        onClick={() => {
          dispatch({
            type: 'removeAssertion',
            value: { key: assertion.key },
          });
        }}
      >
        <span className="codicon codicon-trash" />
      </VSCodeButton>
      <VSCodeButton
        appearance="icon"
        aria-label="Add"
        onClick={() =>
          dispatch({ type: 'addAssertion', value: { key: assertion.key } })
        }
      >
        <span className="codicon codicon-add" />
      </VSCodeButton>
    </div>
  );
}
