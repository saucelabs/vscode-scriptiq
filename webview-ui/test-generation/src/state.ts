export interface Assertion {
  value: string;
}

export interface Platform {
  name: 'iOS' | 'Android';
  version: string;
}

export interface State {
  appName: string;
  testGoal: string;
  assertions: Assertion[];
  maxSteps: number;
  platform: Platform;
  generationState: 'idle' | 'generating' | 'errored' | 'succeeded';
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
};

export type Action =
  | { type: 'clear' }
  | { type: 'setAppName'; value: State['appName'] }
  | { type: 'setTestGoal'; value: State['testGoal'] }
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
    default:
      return current;
  }
};
