export type Region = 'us-west-1' | 'eu-central-1' | 'staging';

export interface Credentials {
  username: string;
  accessKey: string;
  region: Region;
}

export interface TestRecord {
  app_name: string;
  goal: string;
  test_id: string;
  all_steps?: TestStep[];
  user_screen_descs?: string[];
  max_test_steps?: number;
  devices?: string[];
  platform: Platform;
  platform_version?: string;
  region?: string;
  selected_device_name?: string;
  selected_platform_version?: string;
  screen_width?: number;
  screen_height?: number;
  scriptiq_llm_version?: string;
  tunnel_name?: string;
  tunnel_owner?: string;
}

export interface TestStep {
  step_num: number;
  action: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  potential_identifiers: {
    type: string;
    value: string;
    index: number;
    checked: boolean;
    depth: number;
  }[];
  text: string;
  direction: string;
  img_name: string;
  img_url: string;
  event_reason: string;
  screen_descs: string[];
  sd_asserts: string[];
}

export interface Vote {
  rating: string;
  step_num: number;
}

export type StatusUpdateType = 'com.saucelabs.scriptiq.testgen.status';
export type JobUpdateType = 'com.saucelabs.scriptiq.testgen.job';
export type StepUpdateType = 'com.saucelabs.scriptiq.testgen.step';
export type DoneType = 'com.saucelabs.scriptiq.done';
export type RecordUpdateType = 'com.saucelabs.scriptiq.testgen.record';
export type WebSocketErrorType = 'com.saucelabs.scriptiq.error';
export type StoppedType = 'com.saucelabs.scriptiq.stopped';

export interface StatusUpdateResponse {
  type: StatusUpdateType;
  result: {
    status_message: string;
  };
}

export function isStatusUpdateResponse(
  data: unknown,
): data is StatusUpdateResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.testgen.status'
  );
}

export interface JobUpdateResponse {
  type: JobUpdateType;
  result: {
    job_id: string;
    selected_device_name: string;
    selected_platform_version: string;
    screen_width: number;
    screen_height: number;
    scriptiq_llm_version: string;
    session_id: string;
    status_message: string;
  };
}

export function isJobUpdateResponse(data: unknown): data is JobUpdateResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.testgen.job'
  );
}

export interface StepUpdateResponse {
  type: StepUpdateType;
  result: {
    step: TestStep;
  };
}

export function isStepUpdateResponse(
  data: unknown,
): data is StepUpdateResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.testgen.step'
  );
}

/**
 * FIXME: This is a hack to get around the fact that the backend never turns the
 * final test record. For consistencies sake of the client's interface, we
 * pretend that we do.
 */
export interface RecordUpdateResponse {
  type: RecordUpdateType;
  result: TestRecord;
}

export interface DoneResponse {
  type: DoneType;
  result?: never;
}

export function isDoneResponse(data: unknown): data is DoneResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.done'
  );
}

export interface StoppedResponse {
  id: string;
  type: StoppedType;
  result?: never;
}

export function isStoppedResponse(data: unknown): data is StoppedResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type === 'com.saucelabs.scriptiq.stopped'
  );
}

export type Platform = 'android' | 'ios' | 'Android' | 'iOS';

export function isValidRegion(region: unknown): region is Region {
  if (typeof region !== 'string') {
    return false;
  }

  return ['us-west-1', 'eu-central-1', 'staging'].includes(region);
}

export interface WebSocketError {
  id?: string;
  type: WebSocketErrorType;
  code: number;
  reason: string;
}

export function isWebSocketError(data: unknown): data is WebSocketError {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.error'
  );
}

export interface AppInfo {
  id: string;
  name: string;
  kind: string;
  metadata: Map<unknown, unknown>;
}

function isAppInfo(data: unknown): data is AppInfo {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof data.id === 'string' &&
    'name' in data &&
    typeof data.name === 'string' &&
    'kind' in data &&
    typeof data.kind === 'string' &&
    'metadata' in data &&
    typeof data.metadata === 'object'
  );
}

interface AppStorageFilesApiResponse {
  items: AppInfo[];
}

export function isAppStorageFilesApiResponse(
  data: unknown,
): data is AppStorageFilesApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray(data.items) &&
    data.items.every(isAppInfo)
  );
}
