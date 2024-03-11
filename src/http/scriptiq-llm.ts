import { fetch } from 'undici';
import { TextDecoderStream } from 'node:stream/web';
import { Observable } from 'rxjs';

import { GlobalStorage } from '../storage';
import { TestRecord, TestStep, Vote } from '../types';

interface StatusUpdate {
  header: string;
  status_message: string;
}

function isStatusUpdate(data: unknown): data is StatusUpdate {
  return <boolean>(
    (typeof data === 'object' &&
      data &&
      'header' in data &&
      data.header == 'status_update')
  );
}

interface JobUpdate {
  header: string;
  job_id: string;
  selected_device_name: string;
  selected_platform_version: string;
  img_ratio: number;
}

function isJobUpdate(data: unknown): data is JobUpdate {
  return <boolean>(
    (typeof data === 'object' &&
      data &&
      'header' in data &&
      data.header == 'results' &&
      'job_id' in data)
  );
}

interface StepUpdate {
  header: string;
  step_data: TestStep;
  img_data: {
    img_url: string;
    img_out_name: string;
  };
}

function isStepUpdate(data: unknown): data is StepUpdate {
  return <boolean>(
    (typeof data === 'object' &&
      data &&
      'header' in data &&
      data.header == 'results' &&
      'step_data' in data)
  );
}

interface DoneUpdate {
  header: string;
}

function isDoneUpdate(data: unknown): data is DoneUpdate {
  return <boolean>(
    (typeof data === 'object' &&
      data &&
      'header' in data &&
      data.header == 'Done')
  );
}

// Fallback to dev env if SCRIPTIQ_API_SERVER is not set.
const scriptiqServer =
  process.env.SCRIPTIQ_API_SERVER || 'http://127.0.0.1:8000';

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
): Observable<
  TestRecord | StatusUpdate | JobUpdate | StepUpdate | { finished: boolean }
> {
  return new Observable<
    TestRecord | StatusUpdate | JobUpdate | StepUpdate | { finished: boolean }
  >((observer) => {
    // 👇️ const response: Response
    const response = fetch(`${scriptiqServer}/v1/genTest`, {
      method: 'POST',
      body: JSON.stringify({
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
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    response
      .then(async (res) => {
        const textStream = res.body?.pipeThrough(new TextDecoderStream());
        if (textStream) {
          for await (const chunk of textStream) {
            console.log('chunk');
            console.log(chunk);

            const json_components = chunk.split('{"header":');
            console.log(json_components);
            for (const component of json_components) {
              console.log('component');
              console.log(component);
              if (component.length == 0) {
                continue;
              }

              const data = JSON.parse('{"header":' + component);

              if (isStatusUpdate(data)) {
                observer.next(data);
                continue;
              }

              if (isJobUpdate(data)) {
                observer.next(data);
                console.log('Job created.');
                testRecord.selected_device_name = data.selected_device_name;
                testRecord.selected_platform_version =
                  data.selected_platform_version;
                testRecord.img_ratio = data.img_ratio;
                continue;
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
                continue;
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
            }
          }
          observer.next({
            finished: true,
          });
        }
      })
      .catch((err: Error) => {
        observer.error(err?.message);
      });
  });
}

/**
 * Download image from imgURL and save it to `imgDir/imgName`.
 * Skips download if file already exists.
 */
export async function downloadImage(
  testID: string,
  imgURL: string,
  imgName: string,
  username: string,
  accessKey: string,
  storage: GlobalStorage,
) {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      console.log('Retrying image download...');
      await new Promise((f) => setTimeout(f, 1000));
    }
    try {
      const response = await fetch(imgURL, {
        headers: {
          Authorization: 'Basic ' + btoa(username + ':' + accessKey),
        },
      });

      if (response.status === 404) {
        console.log('Image not found.');
        continue;
      }

      if (!response.ok) {
        console.error(`Unexpected response: ${response.statusText}`);
        continue;
      }

      if (!response.body) {
        console.error(`Unexpected response: ${response.statusText}: no body`);
        continue;
      }

      console.log('Saving image...');
      await storage.saveTestRecordAsset(testID, imgName, response.body);
      return;
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }
}

export async function sendUserFeedback(votes: Vote[], testRecord: TestRecord) {
  await fetch(`${scriptiqServer}/v1/submitFeedback`, {
    method: 'POST',
    body: JSON.stringify({
      votes,
      test_record: testRecord,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
