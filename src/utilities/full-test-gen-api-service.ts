import * as vscode from 'vscode';
import { fetch } from 'undici';
import { TextDecoderStream } from 'node:stream/web';
import { Observable } from 'rxjs';
import * as fs from 'fs';

import { createWriteStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
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
                    vscode.workspace.fs.createDirectory(dirURI);
                    fullData.selected_device_name = data.selected_device_name;
                    fullData.selected_platform_version =
                      data.selected_platform_version;
                    fullData.img_ratio = data.img_ratio;
                  } else {
                    observer.next(data);
                    // console.log(`Received step ${data.step_data.step_num}`);
                    // console.log(`Getting img: ${data.img_data.img_url}`);
                    await downloadImage(
                      data.img_data.img_url,
                      data.img_data.img_out_name,
                      dirURI.path,
                      username,
                      accessKey,
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
  imgURL: any,
  imgName: any,
  imgDir: any,
  username: string,
  accessKey: string,
) {
  const localURLFName = imgDir + '/' + imgName;

  let x = 0;
  while (!existsSync(localURLFName) && x < 10) {
    if (x > 0) {
      console.log('Try downloading again');
      await new Promise((f) => setTimeout(f, 1000));
    }
    try {
      const streamPipeline = promisify(pipeline);
      const response: any = await fetch(imgURL, {
        headers: {
          Authorization: 'Basic ' + btoa(username + ':' + accessKey),
        },
      });

      if (!response.ok)
        throw new Error(`unexpected response ${response.statusText}`);

      streamPipeline(response.body, createWriteStream(localURLFName));
    } catch (error) {
      if (error instanceof Error) {
        console.log('error message: ', error.message);
        // return error.message;
      } else {
        console.log('unexpected error: ', error);
        // return 'An unexpected error occurred';
      }
    }
    x += 1;
  }
}

// FIXME why is this in the api service?
export function resendGeneratedTest(
  data: any,
  storagePath: any,
): Observable<string> {
  return new Observable<string>((observer) => {
    console.log(`${storagePath.path}/${data.testID}/data.json`);
    const jsonString = fs.readFileSync(
      `${storagePath.path}/${data.testID}/data.json`,
      'utf-8',
    );
    const jsonData = JSON.parse(jsonString);
    observer.next(jsonData);
  });
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
