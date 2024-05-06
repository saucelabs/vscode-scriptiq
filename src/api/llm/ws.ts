import { ErrorEvent, WebSocket } from 'undici';
import { Observable } from 'rxjs';
import { randomUUID } from 'node:crypto';

import { downloadImage } from './http';
import { GlobalStorage } from '../../storage';
import {
  DoneResponse,
  isDoneResponse,
  isJobUpdateResponse,
  isStatusUpdateResponse,
  isStepUpdateResponse,
  isWebSocketError,
  JobUpdateResponse,
  Platform,
  RecordUpdateResponse,
  StatusUpdateResponse,
  StepUpdateResponse,
  StoppedResponse,
  TestRecord,
  isStoppedResponse,
} from '../../types';
import { isError } from '../../error';
import { Credentials } from '../../types';

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
  creds: Credentials,
): [
  string,
  WebSocket,
  Observable<
    | DoneResponse
    | JobUpdateResponse
    | RecordUpdateResponse
    | StatusUpdateResponse
    | StepUpdateResponse
    | StoppedResponse
  >,
] {
  const ws = new WebSocket(`${wsServer}/v1/ws`, {
    headers: {
      Authorization: 'Basic ' + btoa(creds.username + ':' + creds.accessKey),
    },
  });
  const reqId = randomUUID().split('-')[0];

  const observable = new Observable<
    | DoneResponse
    | JobUpdateResponse
    | RecordUpdateResponse
    | StatusUpdateResponse
    | StepUpdateResponse
    | StoppedResponse
  >((observer) => {
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
          id: reqId,
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
      console.log('closing ws');
      observer.next({
        type: 'com.saucelabs.scriptiq.done',
      });
    };

    ws.onerror = (ev) => {
      observer.error(errorEventToError(ev));
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

        if (isWebSocketError(resp)) {
          observer.error(
            new Error(
              `Test generation request failed with ${resp.code}: ${resp.reason}`,
            ),
          );
          return;
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
          testRecord.scriptiq_llm_version = resp.result.scriptiq_llm_version;
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
          if (!testRecord.all_steps || testRecord.all_steps.length === 0) {
            observer.error(new Error('Test generation yielded no test steps'));
            return;
          }

          console.log('Saving Test Record.');
          storage.saveTestRecord(testRecord);
          const recordUpdate: RecordUpdateResponse = {
            type: 'com.saucelabs.scriptiq.testgen.record',
            result: testRecord,
          };
          observer.next(recordUpdate);
          observer.next(resp);
        }
        if (isStoppedResponse(resp)) {
          console.log('Stopped.');
          observer.next(resp);
        }
      });
    };
  });
  return [reqId, ws, observable];
}

/**
 * Converts a WebSocket ErrorEvent to an Error.
 * If the ErrorEvent has an Error, it will return the Error as-is.
 * Otherwise, it will return a new Error with the message from the ErrorEvent.
 */
function errorEventToError(event: ErrorEvent): Error {
  if (isError(event.error)) {
    return event.error;
  }
  return new Error(`WebSocket Error: ${event.message}`);
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
