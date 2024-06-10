import { v4 as uuidv4 } from 'uuid';
import { Credentials, TestRecord, TestStep, Vote } from '../../../src/types';

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

  // TestRecord
  steps?: TestStep[];
  screen?: {
    width: number;
    height: number;
  };
  testId?: string;

  // Session
  sessionId?: string;
  status: string;
  credentials?: Credentials;
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
  | { type: 'showTestRecord'; value: { testRecord: TestRecord; votes: Vote[] } }
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
      const { testRecord } = action.value;
      let { user_screen_descs = [''] } = testRecord;
      if (user_screen_descs.length === 0) {
        user_screen_descs = [''];
      }
      let screen;
      if (testRecord.screen_width && testRecord.screen_height) {
        screen = {
          width: testRecord.screen_width,
          height: testRecord.screen_height,
        };
      }

      return {
        ...current,
        appName: testRecord.app_name,
        testGoal: testRecord.goal,
        platform: {
          name: testRecord.platform,
          version: testRecord.platform_version,
        },
        maxSteps: testRecord.max_test_steps,
        status: '',
        generationState: 'idle',
        steps: testRecord.all_steps,
        devices: testRecord.devices ?? [],
        assertions: user_screen_descs.map((value) => ({
          key: uuidv4(),
          value,
        })),
        screen,
        testId: testRecord.test_id,
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
