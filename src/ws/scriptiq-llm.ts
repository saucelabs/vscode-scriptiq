import { WebSocket } from 'undici';
import { Observable } from 'rxjs';
import { inspect } from 'node:util';

import {
  JobUpdate,
  StatusUpdate,
  StepUpdate,
  downloadImage,
  isDoneUpdate,
  isJobUpdate,
  isStatusUpdate,
  isStepUpdate,
} from './../http/scriptiq-llm';
import { GlobalStorage } from '../storage';
import { TestRecord } from '../types';
//
// Fallback to dev env if SCRIPTIQ_API_SERVER is not set.
const scriptiqServer = process.env.SCRIPTIQ_API_SERVER || 'ws://127.0.0.1:8000';

export function generateTest(
  storage: GlobalStorage,
  goal: string,
  apk: string,
  maxTestSteps: number,
  username: string,
  accessKey: string,
  region: string,
  devices: string[],
  platformVersion: string,
  assertions: string[],
  testID: string,
  startActions: string[],
  prevGoal: string = '',
) {
  return new Observable<
    TestRecord | StatusUpdate | JobUpdate | StepUpdate | { finished: boolean }
  >((observer) => {
    const ws = new WebSocket(`${scriptiqServer}/v1/genTest`);

    if (prevGoal !== '') {
      if (prevGoal.startsWith('Edit: ')) {
        goal = 'Edit: ' + goal + ', ' + prevGoal;
      } else {
        goal = 'Edit: ' + goal + ', Orig Goal: ' + prevGoal;
      }
    }
    const testRecord: TestRecord = {
      all_steps: [],
      test_id: testID,
      apk: apk,
      goal: goal,
      user_screen_descs: assertions,
      max_test_steps: maxTestSteps,
      devices: devices,
      platform_version: platformVersion,
      region: region,
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          sauce_username: username,
          sauce_api_key: accessKey,
          sauce_data_center: region,
          apk: apk,
          goal: goal,
          num_steps: maxTestSteps,
          device_names: devices,
          platform_version: platformVersion,
          start_actions: startActions,
          assertions: assertions,
        }),
      );
    };

    let taskChain = Promise.resolve();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as unknown;
      console.log(inspect(data, { depth: null }));

      if (isStatusUpdate(data)) {
        observer.next(data);
      }

      if (isJobUpdate(data)) {
        observer.next(data);
        taskChain = taskChain.then(() => {
          console.log('Job created.');
          testRecord.selected_device_name = data.selected_device_name;
          testRecord.selected_platform_version = data.selected_platform_version;
          testRecord.img_ratio = data.img_ratio;
        });
      }

      if (isStepUpdate(data)) {
        observer.next(data);
        taskChain = taskChain.then(() => {
          return downloadImage(
            testID,
            data.img_data.img_url,
            data.img_data.img_out_name,
            username,
            accessKey,
            storage,
          ).then(() => {
            console.log('STEP INFO');
            console.log(data.step_data);
            testRecord.all_steps?.push(data.step_data);
          });
        });
      }

      if (isDoneUpdate(data)) {
        taskChain = taskChain.then(() => {
          if (testRecord.all_steps && testRecord.all_steps.length > 0) {
            console.log('Saving Test Record.');
            storage.saveTestRecord(testRecord);
            observer.next(testRecord);
          }
          observer.next({
            finished: true,
          });
        });
      }
    };
  });
}
