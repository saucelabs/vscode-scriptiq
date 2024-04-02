import { WebSocket } from 'undici';
import { Observable } from 'rxjs';

import { downloadImage } from './http';
import { GlobalStorage } from '../../storage';
import {
  TestRecord,
  JobUpdate,
  StatusUpdate,
  StepUpdate,
  isDoneUpdate,
  isJobUpdate,
  isStatusUpdate,
  isStepUpdate,
} from '../../types';

const scriptiqServer = process.env.SCRIPTIQ_WS_SERVER || 'ws://127.0.0.1:8000';

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

    ws.onerror = (err) => {
      observer.error(err);
      ws.close();
    };

    const taskQueue = new AsyncQueue((error) => {
      observer.error(error);
      // TODO: Add a status for closure
      ws.close();
    });
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as unknown;
      console.log(data);

      if (isStatusUpdate(data)) {
        observer.next(data);
      }

      if (isJobUpdate(data)) {
        observer.next(data);
        taskQueue.enqueue(() => {
          console.log('Job created.');
          testRecord.selected_device_name = data.selected_device_name;
          testRecord.selected_platform_version = data.selected_platform_version;
          testRecord.img_ratio = data.img_ratio;
        });
      }

      if (isStepUpdate(data)) {
        observer.next(data);
        taskQueue.enqueue(async () => {
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
        taskQueue.enqueue(() => {
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

/**
 * AsyncQueue executes async tasks in the order they are enqueued.
 */
class AsyncQueue {
  private taskChain: Promise<void | null | undefined>;
  private onError?: (err: Error) => void;
  hasErrored: boolean;

  constructor(onError?: (err: Error) => void) {
    this.taskChain = Promise.resolve<void | null | undefined>(null);
    this.onError = onError;
    this.hasErrored = false;
  }

  enqueue(
    task: (
      val: void | null | undefined,
    ) => void | PromiseLike<void> | null | undefined,
  ) {
    if (!this.hasErrored) {
      this.taskChain = this.taskChain.then(() => {
        try {
          if (!this.hasErrored) {
            return task();
          }
        } catch (e) {
          if (!this.hasErrored && this.onError) {
            this.onError(e as Error);
            this.hasErrored = true;
          }
        }
      });
    }
  }
}
