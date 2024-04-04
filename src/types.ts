export interface Credentials {
  username: string;
  accessKey: string;
  region: string;
}

export interface TestRecord {
  apk: string;
  goal: string;
  test_id: string;
  all_steps?: TestStep[];
  user_screen_descs?: string[];
  max_test_steps?: number;
  devices?: string[];
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
  img_out_name: string;
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

export interface StatusUpdate {
  header: string;
  status_message: string;
}

export function isStatusUpdate(data: unknown): data is StatusUpdate {
  return (
    typeof data === 'object' &&
    data != null &&
    'header' in data &&
    data.header == 'status_update'
  );
}

export interface JobUpdate {
  header: string;
  job_id: string;
  selected_device_name: string;
  selected_platform_version: string;
  img_ratio: number;
}

export function isJobUpdate(data: unknown): data is JobUpdate {
  return (
    typeof data === 'object' &&
    data != null &&
    'header' in data &&
    data.header == 'results' &&
    'job_id' in data
  );
}

export interface StepUpdate {
  header: string;
  step_data: TestStep;
  img_data: {
    img_url: string;
    img_out_name: string;
  };
}

export function isStepUpdate(data: unknown): data is StepUpdate {
  return (
    typeof data === 'object' &&
    data != null &&
    'header' in data &&
    data.header == 'results' &&
    'step_data' in data
  );
}

export interface DoneUpdate {
  header: string;
}

export function isDoneUpdate(data: unknown): data is DoneUpdate {
  return (
    typeof data === 'object' &&
    data != null &&
    'header' in data &&
    data.header == 'Done'
  );
}
