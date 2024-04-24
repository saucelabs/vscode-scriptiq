import { WebSocket } from 'undici';
import { Observable } from 'rxjs';

import { downloadImage } from './http';
import { GlobalStorage } from '../../storage';
import {
  DoneResponse,
  JobUpdateResponse,
  Platform,
  RecordUpdateResponse,
  SessionUpdateResponse,
  StatusUpdateResponse,
  StepUpdateResponse,
  TestRecord,
} from '../../types';
import {
  isDoneResponse,
  isJobUpdateResponse,
  isSessionUpdateResponse,
  isStatusUpdateResponse,
  isStepUpdateResponse,
} from '../../types';

const wsServer = process.env.SCRIPTIQ_WS_SERVER || 'ws://127.0.0.1:8000';

export function generateTest(
  storage: GlobalStorage,
  goal: string,
  appName: string,
  maxTestSteps: number,
  username: string,
  accessKey: string,
  region: string,
  devices: string[],
  platform: Platform,
  platformVersion: string,
  assertions: string[],
  testID: string,
  prevGoal: string = '',
) {
  return new Observable<
    | DoneResponse
    | JobUpdateResponse
    | RecordUpdateResponse
    | SessionUpdateResponse
    | StatusUpdateResponse
    | StepUpdateResponse
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
      app_name: appName,
      goal: goal,
      user_screen_descs: assertions,
      max_test_steps: maxTestSteps,
      devices: devices,
      platform: platform,
      platform_version: platformVersion,
      region: region,
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          method: 'testgen.start',
          data: {
            username: username,
            access_key: accessKey,
            app_name: appName,
            goal: goal,
            num_steps: maxTestSteps,
            device_names: devices,
            platform: platform,
            platform_version: platformVersion,
            assertions: assertions,
          },
        }),
      );
    };

    ws.onclose = () => {
      observer.next({
        type: 'com.saucelabs.scriptiq.done',
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
        const resp = JSON.parse(event.data) as unknown;
        console.log(resp);

        if (isSessionUpdateResponse(resp)) {
          console.log('Session created.');
          // FIXME hack. The backend never returns the creds and the client should
          // not be responsible for setting them either.
          resp.result.username = username;
          resp.result.accessKey = accessKey;
          resp.result.region = region;
          observer.next(resp);
        }

        if (isStatusUpdateResponse(resp)) {
          console.log('Status Update.');
          observer.next(resp);
        }

        if (isJobUpdateResponse(resp)) {
          console.log('Job created.');
          observer.next(resp);
          testRecord.selected_device_name = resp.result.selected_device_name;
          testRecord.selected_platform_version =
            resp.result.selected_platform_version;
          testRecord.screen_width = resp.result.screen_width;
          testRecord.screen_height = resp.result.screen_height;
        }

        if (isStepUpdateResponse(resp)) {
          console.log('Step created.');
          observer.next(resp);
          await downloadImage(
            testID,
            resp.result.step.img_url,
            resp.result.step.img_name,
            username,
            accessKey,
            storage,
          );
          console.log('STEP INFO');
          console.log(resp.result.step);
          testRecord.all_steps?.push(resp.result.step);
        }

        if (isDoneResponse(resp)) {
          console.log('Done.');
          // Validate necessary fields in the test record.
          if (!testRecord.app_name) {
            observer.error(
              'Application name missing in test record; skipping save. Please check data integrity.',
            );
            return;
          }
          if (!testRecord.goal) {
            observer.error(
              'Test goal missing in test record; skipping save. Please check data integrity.',
            );
            return;
          }
          if (testRecord.all_steps && testRecord.all_steps.length > 0) {
            console.log('Saving Test Record.');
            storage.saveTestRecord(testRecord);
            const recordUpdate: RecordUpdateResponse = {
              type: 'com.saucelabs.scriptiq.testgen.record',
              result: testRecord,
            };
            observer.next(recordUpdate);
          }
          observer.next(resp);
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
