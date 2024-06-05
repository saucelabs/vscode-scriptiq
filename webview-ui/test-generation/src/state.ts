import { v4 as uuidv4 } from 'uuid';
import { TestRecord, TestStep } from '../../../src/types';

export interface Assertion {
  value: string;
  key: string;
}

export interface Platform {
  name: 'iOS' | 'Android';
  version?: string;
}

export interface State {
  appName: string;
  testGoal: string;
  assertions: Assertion[];
  maxSteps?: number;
  platform: Platform;
  generationState: 'idle' | 'generating' | 'errored' | 'succeeded';
  status: string;
  steps?: TestStep[];
}

export const initialState: State = {
  appName: '',
  testGoal: '',
  assertions: [
    {
      value: '',
      key: uuidv4(),
    },
  ],
  maxSteps: 10,
  platform: {
    name: 'Android',
    version: '10',
  },
  generationState: 'idle',
  status: '',
};

export type Action =
  | { type: 'clear' }
  | { type: 'setAppName'; value: State['appName'] }
  | { type: 'setTestGoal'; value: State['testGoal'] }
  | { type: 'setMaxSteps'; value: State['maxSteps'] }
  | { type: 'setPlatformName'; value: State['platform']['name'] }
  | { type: 'setPlatformVersion'; value: State['platform']['version'] }
  | { type: 'setStatus'; value: State['status'] }
  | { type: 'showTestRecord'; value: TestRecord }
  | { type: 'addAssertion'; value: { key: string } }
  | { type: 'setAssertionValue'; value: { key: string; value: string } }
  | { type: 'startGeneration' }
  | { type: 'stopGeneration' };

export const reducer = (current: State, action: Action): State => {
  switch (action.type) {
    case 'clear':
      return initialState;
    case 'setAssertionValue': {
      const { key, value } = action.value;
      return {
        ...current,
        assertions: [
          ...current.assertions.map((assertion) => {
            if (assertion.key === key) {
              return {
                key,
                value,
              };
            } else {
              return assertion;
            }
          }),
        ],
      };
    }
    case 'addAssertion': {
      const { key } = action.value;
      const i = current.assertions.findIndex(
        (assertion) => assertion.key === key,
      );
      return {
        ...current,
        assertions: [
          ...current.assertions.slice(0, i + 1),
          {
            key: uuidv4(),
            value: '',
          },
          ...current.assertions.slice(i + 1),
        ],
      };
    }
    case 'setAppName':
      return {
        ...current,
        appName: action.value,
      };
    case 'setTestGoal':
      return {
        ...current,
        testGoal: action.value,
      };
    case 'setMaxSteps':
      return {
        ...current,
        maxSteps: action.value,
      };
    case 'setPlatformName':
      return {
        ...current,
        platform: {
          ...current.platform,
          name: action.value,
        },
      };
    case 'setPlatformVersion':
      return {
        ...current,
        platform: {
          ...current.platform,
          version: action.value,
        },
      };
    case 'startGeneration':
      return {
        ...current,
        generationState: 'generating',
      };
    case 'stopGeneration':
      return {
        ...current,
        generationState: 'idle',
      };
    case 'setStatus':
      return {
        ...current,
        status: action.value,
      };
    case 'showTestRecord': {
      let { user_screen_descs = [''] } = action.value;
      if (user_screen_descs.length === 0) {
        user_screen_descs = [''];
      }
      return {
        ...current,
        appName: action.value.app_name,
        testGoal: action.value.goal,
        platform: {
          name: action.value.platform,
          version: action.value.platform_version,
        },
        maxSteps: action.value.max_test_steps,
        status: '',
        generationState: 'idle',
        steps: action.value.all_steps,
        assertions: user_screen_descs.map((value) => ({
          key: uuidv4(),
          value,
        })),
      };
    }
    default:
      return current;
  }
};
