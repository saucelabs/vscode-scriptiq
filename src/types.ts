export interface Credentials {
  username: string;
  accessKey: string;
  region: string;
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
  img_ratio?: number;
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
    id_type: string;
    id_value: string;
    id_num: number;
    checked: boolean;
    depth: number;
  }[];
  text: string;
  direction: string;
  img_name: string;
  img_url: string;
  multiple_choice_options: string;
  event_reason: string;
  event_llm_output: string;
  screen_descs: string[];
  sd_asserts: string[];
}

export interface Vote {
  rating: string;
  step_num: number;
}

export type StatusUpdateType = 'com.saucelabs.scriptiq.testgen.status';
export type SessionUpdateType = 'com.saucelabs.scriptiq.testgen.session';
export type JobUpdateType = 'com.saucelabs.scriptiq.testgen.job';
export type StepUpdateType = 'com.saucelabs.scriptiq.testgen.step';
export type DoneType = 'com.saucelabs.scriptiq.done';
export type RecordUpdateType = 'com.saucelabs.scriptiq.testgen.record';

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

export interface SessionUpdateResponse {
  type: SessionUpdateType;
  result: {
    session_id: string;
    username?: string;
    accessKey?: string;
    region?: string;
  };
}

export function isSessionUpdateResponse(
  data: unknown,
): data is SessionUpdateResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.testgen.session'
  );
}

export interface JobUpdateResponse {
  type: JobUpdateType;
  result: {
    job_id: string;
    selected_device_name: string;
    selected_platform_version: string;
    img_ratio: number;
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

export type Platform = 'Android' | 'iOS';
