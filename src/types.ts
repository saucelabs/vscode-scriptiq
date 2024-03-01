export interface Credentials {
  username: string;
  accessKey: string;
  region: string;
}

export interface TestRecord {
  apk: string;
  goal: string;
  testID: string;
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
