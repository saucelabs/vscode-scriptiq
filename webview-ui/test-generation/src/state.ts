import { v4 as uuidv4 } from 'uuid';
import { Credentials, TestRecord, Vote, AppInfo } from '../../../src/types';

export interface Assertion {
  value: string;
  key: string;
}

export interface Platform {
  name: 'ios' | 'android';
  version?: string;
}

export interface Step {
  index: number;
  testRecordId: string;
  action: string;
  actionMetadata: {
    direction: string;
    text: string;
  };
  screenshot: {
    name: string;
    width: number;
    height: number;
    annotation: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  potential_identifiers: {
    type: string;
    value: string;
    index: number;
    checked: boolean;
    depth: number;
  }[];
  selectedIdentifier: number | 'skip';
  event_reason: string;
  vote?: string;
  assertionMatches: {
    description: string;
    value: 'true' | 'false';
  }[];
  screen_descs: string[];
}

export interface Tunnel {
  name?: string;
  owner?: string;
}

export interface State {
  appName: string;
  testGoal: string;
  assertions: Assertion[];
  maxSteps: number | '';
  region?: string;
  platform: Platform;
  device?: string;
  generationState: 'idle' | 'generating' | 'errored' | 'finishing';

  steps?: Step[];

  job?: {
    id: string;
    device?: string;
    platform: Platform;
  };
  // Session
  sessionId?: string;
  status: string;
  // TODO: Should come from the connect webview somehow?
  credentials?: Credentials;

  language: 'python' | 'java';

  tunnel: Tunnel;

  loadedAppInfo: AppInfo[];
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
  region: '',
  platform: {
    name: 'android',
    version: '',
  },
  generationState: 'idle',
  status: '',
  language: 'python',
  tunnel: {
    name: '',
    owner: '',
  },
  loadedAppInfo: [],
};

export type Action =
  | { type: 'clear' }
  | {
      type: 'setAppName';
      value: {
        appName: State['appName'];
        platformName: State['platform']['name'];
      };
    }
  | { type: 'setTestGoal'; value: State['testGoal'] }
  | { type: 'setMaxSteps'; value: string }
  | { type: 'setPlatformName'; value: State['platform']['name'] }
  | { type: 'setPlatformVersion'; value: State['platform']['version'] }
  | { type: 'setStatus'; value: State['status'] }
  | { type: 'setGenerationState'; value: State['generationState'] }
  | { type: 'setDevice'; value: string }
  | { type: 'setTunnelName'; value: State['tunnel']['name'] }
  | { type: 'setTunnelOwner'; value: State['tunnel']['owner'] }
  | { type: 'showTestRecord'; value: { testRecord: TestRecord; votes: Vote[] } }
  | { type: 'loadNewRecord'; value: TestRecord }
  | { type: 'loadAppNames'; value: AppInfo[] }
  | { type: 'addAssertion'; value: { key: string } }
  | { type: 'removeAssertion'; value: { key: string } }
  | { type: 'setAssertionValue'; value: { key: string; value: string } }
  | { type: 'setLanguage'; value: State['language'] }
  | {
      type: 'selectStepIdentifier';
      value: { stepIndex: number; selectedIdentifier: number | 'skip' };
    }
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
  | { type: 'finish' }
  | {
      type: 'vote';
      value: { index: number; value: 'like' | 'dislike' | 'norating' };
    };

export const reducer = (current: State, action: Action): State => {
  switch (action.type) {
    case 'clear':
      return initialState;
    case 'setLanguage':
      return {
        ...current,
        language: action.value,
      };
    case 'selectStepIdentifier':
      return {
        ...current,
        steps: current.steps?.map((step) => {
          if (step.index !== action.value.stepIndex) {
            return step;
          }
          return {
            ...step,
            selectedIdentifier: action.value.selectedIdentifier,
          };
        }),
      };
    case 'setDevice':
      return {
        ...current,
        device: action.value,
      };
    case 'finish':
      return {
        ...current,
        generationState: 'idle',
        status: '',
        sessionId: '',
      };
    case 'vote':
      return {
        ...current,
        steps: current.steps?.map((step) => {
          if (action.value.index === step.index) {
            return {
              ...step,
              vote: action.value.value,
            };
          }
          return step;
        }),
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
      const updated = current.assertions.filter(
        (a) => a.key !== action.value.key,
      );
      if (updated.length === 0) {
        updated.push({
          key: uuidv4(),
          value: '',
        });
      }
      return {
        ...current,
        assertions: updated,
      };
    }
    case 'setAppName':
      return {
        ...current,
        appName: action.value.appName,
        platform: {
          ...current.platform,
          name: action.value.platformName,
        },
      };
    case 'setTestGoal':
      return {
        ...current,
        testGoal: action.value,
      };
    case 'setMaxSteps': {
      let { value } = action;
      value = value.replaceAll(/\D/g, '');
      const maxSteps = value === '' ? value : parseInt(value);
      return {
        ...current,
        maxSteps,
      };
    }
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
    case 'loadNewRecord': {
      const testRecord = action.value;

      let { user_screen_descs = [''] } = testRecord;
      if (user_screen_descs.length === 0) {
        user_screen_descs = [''];
      }
      return {
        ...current,
        generationState: 'finishing',
        appName: testRecord.app_name,
        testGoal: testRecord.goal,
        platform: {
          name: testRecord.platform,
          version: testRecord.platform_version,
        },
        maxSteps: testRecord.max_test_steps ?? '',
        region: testRecord.region,
        status: '',
        job: {
          id: testRecord.test_id,
          device: testRecord.selected_device_name,
          platform: {
            name: testRecord.platform,
            version: testRecord.selected_platform_version,
          },
        },
        steps:
          testRecord.all_steps?.map((step) => {
            return {
              index: step.step_num,
              testRecordId: testRecord.test_id,
              action: step.action,
              actionMetadata: {
                direction: step.direction,
                text: step.text,
              },
              screenshot: {
                name: step.img_name,
                width: testRecord.screen_width ?? 0,
                height: testRecord.screen_height ?? 0,
                annotation: { ...step.location },
              },
              potential_identifiers: step.potential_identifiers.map((item) => ({
                ...item,
              })),
              selectedIdentifier: 0,
              event_reason: step.event_reason,
              screen_descs: [...step.screen_descs],
              assertionMatches: step.sd_asserts.map((a, i) => ({
                description: testRecord.user_screen_descs?.[i] ?? '',
                value: a ? 'true' : 'false',
              })),
            };
          }) ?? [],
        device: testRecord.devices?.join(',') ?? '',
        assertions: user_screen_descs.map((value) => ({
          key: uuidv4(),
          value,
        })),
        tunnel: {
          name: testRecord.tunnel_name,
          owner: testRecord.tunnel_owner,
        },
      };
    }
    case 'loadAppNames': {
      const appNamesInfo = action.value;

      return {
        ...current,
        loadedAppInfo: appNamesInfo,
      };
    }
    case 'showTestRecord': {
      const { testRecord, votes } = action.value;
      let { user_screen_descs = [''] } = testRecord;
      if (user_screen_descs.length === 0) {
        user_screen_descs = [''];
      }
      return {
        ...current,
        appName: testRecord.app_name,
        testGoal: testRecord.goal,
        platform: {
          name: testRecord.platform,
          version: testRecord.platform_version,
        },
        maxSteps: testRecord.max_test_steps ?? '',
        region: testRecord.region,
        status: '',
        generationState: 'idle',
        job: {
          id: testRecord.test_id,
          device: testRecord.selected_device_name,
          platform: {
            name: testRecord.platform,
            version: testRecord.selected_platform_version,
          },
        },
        steps:
          testRecord.all_steps?.map((step) => {
            return {
              index: step.step_num,
              testRecordId: testRecord.test_id,
              action: step.action,
              actionMetadata: {
                direction: step.direction,
                text: step.text,
              },
              screenshot: {
                name: step.img_name,
                width: testRecord.screen_width ?? 0,
                height: testRecord.screen_height ?? 0,
                annotation: { ...step.location },
              },
              potential_identifiers: step.potential_identifiers.map((item) => ({
                ...item,
              })),
              selectedIdentifier: 0,
              event_reason: step.event_reason,
              screen_descs: [...step.screen_descs],
              vote: votes.find((v) => v.step_num === step.step_num)?.rating,
              assertionMatches: step.sd_asserts.map((a, i) => ({
                description: testRecord.user_screen_descs?.[i] ?? '',
                value: a ? 'true' : 'false',
              })),
            };
          }) ?? [],
        device: testRecord.devices?.join(',') ?? '',
        assertions: user_screen_descs.map((value) => ({
          key: uuidv4(),
          value,
        })),
        tunnel: {
          name: testRecord.tunnel_name,
          owner: testRecord.tunnel_owner,
        },
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
    case 'setTunnelName': {
      return {
        ...current,
        tunnel: {
          ...current.tunnel,
          name: action.value,
        },
      };
    }
    case 'setTunnelOwner': {
      return {
        ...current,
        tunnel: {
          ...current.tunnel,
          owner: action.value,
        },
      };
    }
    default:
      return current;
  }
};
