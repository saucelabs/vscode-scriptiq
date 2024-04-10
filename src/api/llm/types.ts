import { TestStep } from '../../types';

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

interface SessionUpdateResponse {
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

export interface DoneResponse {
  type: DoneType;
}

export function isDoneResponse(data: unknown): data is DoneResponse {
  return (
    typeof data === 'object' &&
    data != null &&
    'type' in data &&
    data.type == 'com.saucelabs.scriptiq.done'
  );
}
