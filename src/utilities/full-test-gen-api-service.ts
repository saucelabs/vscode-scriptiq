import * as vscode from 'vscode';
import { fetch } from 'undici';
import { TextDecoderStream } from 'node:stream/web';
import { Observable } from 'rxjs';

import { GlobalStorage } from '../storage';

// Fallback to dev env if SCRIPTIQ_API_SERVER is not set.
const scriptiqServer =
  process.env.SCRIPTIQ_API_SERVER || 'http://127.0.0.1:8000';

export function askToTestGenerationAPIAsStream(
  goal: string,
  apk: string,
  maxTestSteps: number,
  username: string,
  accessKey: string,
  region: string,
  devices: any,
  platformVersion: string,
  assertions: Array<string>,
  testID: string,
  dirURI: vscode.Uri,
  startActions: any = undefined,
  prevGoal: string = '',
  storage: GlobalStorage,
): Observable<string> {
  return new Observable<string>((observer) => {
    // 👇️ const response: Response
    const response = fetch(`${scriptiqServer}/gen_full_test`, {
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

    const fullData: any = {
      all_steps: [],
      testID: testID,
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
              const data: any = JSON.parse('{"header":' + component);
              if ('header' in data) {
                if (data.header == 'results') {
                  if ('job_id' in data) {
                    observer.next(data);
                    console.log('job generated, general info');
                    fullData.selected_device_name = data.selected_device_name;
                    fullData.selected_platform_version =
                      data.selected_platform_version;
                    fullData.img_ratio = data.img_ratio;
                  } else {
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
                    fullData.all_steps.push(data.step_data);
                  }
                } else if (data.header === 'Done') {
                  if (fullData.all_steps.length > 0) {
                    console.log('Saving Test Record.');
                    storage.saveTestRecord(fullData);
                    observer.next(fullData);
                  }
                  const finishedFlag: any = {
                    finished: true,
                  };
                  observer.next(finishedFlag);
                } else {
                  observer.next(data);
                }
              }
            }
          }
          const finishedFlag: any = {
            finished: true,
          };
          observer.next(finishedFlag);
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
  imgURL: any,
  imgName: any,
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

export function sendUserRating(rating: string, step: number, testRecord: any) {
  fetch(`${scriptiqServer}/gather_user_rating`, {
    method: 'POST',
    body: JSON.stringify({
      rating: rating,
      step_num: step,
      test_record: testRecord,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
