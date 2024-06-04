import { TestRecord, TestStep } from '../../../src/types';

export interface Assertion {
  value: string;
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
  assertions: [],
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
  | { type: 'startGeneration' }
  | { type: 'stopGeneration' };

export const reducer = (current: State, action: Action): State => {
  switch (action.type) {
    case 'clear':
      return initialState;
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
    case 'showTestRecord':
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
      };
    default:
      return current;
  }
};
