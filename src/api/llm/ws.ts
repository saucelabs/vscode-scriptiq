import { WebSocket } from 'undici';
import { Observable } from 'rxjs';

import { downloadImage } from './http';
import { GlobalStorage } from '../../storage';
import {
  TestRecord,
  JobUpdate,
  StatusUpdate,
  StepUpdate,
  DeviceStreamUpdate,
  isDoneUpdate,
  isJobUpdate,
  isStatusUpdate,
  isStepUpdate,
} from '../../types';

const wsServer = process.env.SCRIPTIQ_WS_SERVER || 'ws://127.0.0.1:8000';

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
    | TestRecord
    | StatusUpdate
    | JobUpdate
    | StepUpdate
    | DeviceStreamUpdate
    | { finished: boolean }
  >((observer) => {
    const ws = new WebSocket(`${wsServer}/v1/genTest`);

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
          method: 'testgen.start',
          data: {
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
          },
        }),
      );
    };

    ws.onclose = () => {
      observer.next({
        finished: true,
      });
    };

    ws.onerror = (err) => {
      observer.error(err);
      ws.close();
    };

    const taskQueue = new AsyncQueue({
      onError: (error) => {
        observer.error(error);
        ws.close();
      },
    });
    ws.onmessage = (event) => {
      taskQueue.enqueue(async () => {
        const data = JSON.parse(event.data) as unknown;
        console.log(data);

        if (
          typeof data === 'object' &&
          data != null &&
          'session_id' in data &&
          typeof data.session_id === 'string'
        ) {
          const deviceStreamData: DeviceStreamUpdate = {
            session_id: data.session_id,
            username: username,
            accessKey: accessKey,
            endpoint: region,
          };
          observer.next(deviceStreamData);
        }

        if (isStatusUpdate(data)) {
          observer.next(data);
        }

        if (isJobUpdate(data)) {
          observer.next(data);
          console.log('Job created.');
          testRecord.selected_device_name = data.selected_device_name;
          testRecord.selected_platform_version = data.selected_platform_version;
          testRecord.img_ratio = data.img_ratio;
        }

        if (isStepUpdate(data)) {
          observer.next(data);
          await downloadImage(
            testID,
            data.img_data.img_url,
            data.img_data.img_out_name,
            username,
            accessKey,
            storage,
          );
          console.log('STEP INFO');
          console.log(data.step_data);
          testRecord.all_steps?.push(data.step_data);
        }

        if (isDoneUpdate(data)) {
          if (testRecord.all_steps && testRecord.all_steps.length > 0) {
            console.log('Saving Test Record.');
            storage.saveTestRecord(testRecord);
            observer.next(testRecord);
          }
          observer.next({
            finished: true,
          });
        }
      });
    };
  });
}

/**
 * AsyncQueue executes async tasks in the order they are enqueued.
 * If the currently executing task throws an error, all subsequent tasks
 * will be cancelled, the error handler will be called and the queue will no
 * longer accept any new tasks.
 */
class AsyncQueue {
  private currentTask: Promise<void | null | undefined>;
  private onError?: (err: Error) => void;
  hasErrored: boolean;

  constructor(opts?: { onError?: (err: Error) => void }) {
    this.currentTask = Promise.resolve<void | null | undefined>(null);
    this.onError = opts?.onError;
    this.hasErrored = false;
  }

  enqueue(
    task: (
      val: void | null | undefined,
    ) => void | PromiseLike<void> | null | undefined,
  ) {
    if (!this.hasErrored) {
      this.currentTask = this.currentTask.then(() => {
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
