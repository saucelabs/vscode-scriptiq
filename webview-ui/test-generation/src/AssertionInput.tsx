import {
  VSCodeButton,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { Action, Assertion } from './state';
import trashIcon from './icons/icn-trash-fill.svg';
import plusIcon from './icons/icn-plus-fill.svg';

interface AssertionInputProps {
  dispatch: React.Dispatch<Action>;
  assertion: Assertion;
  removable: boolean;
}

export function AssertionInput(props: AssertionInputProps) {
  const { dispatch, assertion, removable } = props;
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
          if (removable) {
            dispatch({
              type: 'removeAssertion',
              value: { key: assertion.key },
            });
            return;
          }
          dispatch({
            type: 'setAssertionValue',
            value: { key: assertion.key, value: '' },
          });
        }}
      >
        <img
          style={{
            width: '16px',
            filter:
              'invert(92%) sepia(1%) saturate(103%) hue-rotate(314deg) brightness(88%) contrast(98%)',
          }}
          src={trashIcon}
        />
      </VSCodeButton>
      <VSCodeButton
        appearance="icon"
        aria-label="Add"
        onClick={() =>
          dispatch({ type: 'addAssertion', value: { key: assertion.key } })
        }
      >
        <img
          style={{
            width: '16px',
            filter:
              'invert(92%) sepia(1%) saturate(103%) hue-rotate(314deg) brightness(88%) contrast(98%)',
          }}
          src={plusIcon}
        />
      </VSCodeButton>
    </div>
  );
}
