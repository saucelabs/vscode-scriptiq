import { v4 as uuidv4 } from 'uuid';
import { Credentials, TestRecord, TestStep } from '../../../src/types';

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
  devices: string[];
  generationState: 'idle' | 'generating' | 'errored' | 'succeeded';
  status: string;
  steps?: TestStep[];
  screen?: {
    width: number;
    height: number;
  };

  sessionId?: string;
  credentials?: Credentials;
  testId?: string;
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
  devices: [],
};

export type Action =
  | { type: 'clear' }
  | { type: 'setAppName'; value: State['appName'] }
  | { type: 'setTestGoal'; value: State['testGoal'] }
  | { type: 'setMaxSteps'; value: State['maxSteps'] }
  | { type: 'setPlatformName'; value: State['platform']['name'] }
  | { type: 'setPlatformVersion'; value: State['platform']['version'] }
  | { type: 'setStatus'; value: State['status'] }
  | { type: 'setGenerationState'; value: State['generationState'] }
  | { type: 'toggleDevice'; value: string }
  | { type: 'showTestRecord'; value: TestRecord }
  | { type: 'addAssertion'; value: { key: string } }
  | { type: 'removeAssertion'; value: { key: string } }
  | { type: 'setAssertionValue'; value: { key: string; value: string } }
  | { type: 'startGeneration' }
  | { type: 'stopGeneration' }
  | {
      type: 'showVideo';
      value: {
        sessionId: State['sessionId'];
        status: State['status'];
        credentials: State['credentials'];
      };
    }
  | { type: 'finish' };

export const reducer = (current: State, action: Action): State => {
  switch (action.type) {
    case 'clear':
      return initialState;
    case 'toggleDevice': {
      const { value: device } = action;
      let devices = current.devices;
      if (devices.includes(device)) {
        devices = devices.filter((d) => d !== device);
      } else {
        devices = [...devices, device];
      }

      return {
        ...current,
        devices,
      };
    }
    case 'finish':
      return {
        ...current,
        generationState: 'succeeded',
        status: '',
        sessionId: '',
      };
    case 'setGenerationState':
      return {
        ...current,
        generationState: action.value,
      };
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
    case 'removeAssertion': {
      return {
        ...current,
        assertions: current.assertions.filter(
          (a) => a.key !== action.value.key,
        ),
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
      let screen;
      if (action.value.screen_width && action.value.screen_height) {
        screen = {
          width: action.value.screen_width,
          height: action.value.screen_height,
        };
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
        devices: action.value.devices ?? [],
        assertions: user_screen_descs.map((value) => ({
          key: uuidv4(),
          value,
        })),
        screen,
        testId: action.value.test_id,
      };
    }
    case 'showVideo': {
      return {
        ...current,
        sessionId: action.value.sessionId,
        status: action.value.status,
        credentials: action.value.credentials,
      };
    }
    default:
      return current;
  }
};
