import * as vscode from "vscode";
import { fetch } from 'undici';
import { TextDecoderStream } from 'node:stream/web';
import { Observable } from 'rxjs';
import * as fs from 'fs';

import {createWriteStream, existsSync } from 'node:fs';
import {pipeline} from 'node:stream';
import {promisify} from 'node:util';

// Use dev env if SCRIPTIQ_API_SERVER is not set.
const scriptiqServer = process.env.SCRIPTIQ_API_SERVER || 'http://127.0.0.1:8000';

/**
 * Create asnyc request to ScriptIQ api and gets stream.
 * @param goal of the test.
 * @param apk to test the app.
 * @param sauceUsername sauce labs username.
 * @param sauceAccessKey sauce labs access key.
 * @param data_center sauce labs data center to run test on.
 * @returns 
 */
export function askToTestGenerationAPIAsStream(goal: string, apk: string, max_test_steps: number, sauceUsername: string, sauceAccessKey: string, 
    data_center: string, devices: any, platformVersion: string, assertions: Array<string>, testID: string, dirURI: vscode.Uri, outputURI: vscode.Uri, start_actions: any=undefined, prev_goal: string=""): Observable<string> {

    return new Observable<string>(observer => {
        // 👇️ const response: Response
        const response = fetch(`${scriptiqServer}/gen_full_test`,
        { 
            method: 'POST',
            body: JSON.stringify({
                sauce_username: sauceUsername,
                sauce_api_key: sauceAccessKey,
                sauce_data_center: data_center,
                apk: apk,
                goal: goal,
                num_steps: max_test_steps,
                device_names: devices,
                platform_version: platformVersion,
                start_actions: start_actions, 
                assertions: assertions
            }),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (prev_goal !== "") {
            if (prev_goal.startsWith("Edit: ")) {
                goal = "Edit: " + goal + ", " + prev_goal;
            } else {
                goal = "Edit: " + goal + ", Orig Goal: " + prev_goal;
            }
        }

        const full_data: any = {
            "all_steps": [],
            "testID": testID,
            "apk": apk,
            "goal": goal,
            "user_screen_descs": assertions,
            "max_test_steps": max_test_steps,
            "devices": devices,
            "platform_version": platformVersion,
            "data_center": data_center
        };
        response.then(async res => {
            const textStream = res.body?.pipeThrough(new TextDecoderStream());
            if (textStream) {
                for await (const chunk of textStream) {
                    console.log("chunk");
                    console.log(chunk);

                    let json_components = chunk.split("{\"header\":");
                    console.log(json_components);
                    for (const component of json_components) {
                        console.log("component");
                        console.log(component);
                        if (component.length == 0) {
                            continue;
                        }
                        const data: any = JSON.parse("{\"header\":" + component);
                        if ("header" in data) {
                            if (data.header == "results") {
                                if ("job_id" in data) {
                                    observer.next(data);
                                    console.log("job generated, general info");
                                    vscode.workspace.fs.createDirectory(dirURI);
                                    full_data.selected_device_name = data.selected_device_name;
                                    full_data.selected_platform_version = data.selected_platform_version;
                                    full_data.img_ratio = data.img_ratio;
                                } else {
                                    observer.next(data);
                                    // console.log(`Received step ${data.step_data.step_num}`);
                                    // console.log(`Getting img: ${data.img_data.img_url}`);
                                    var img_data = data.img_data;
                                    await downloadImage(img_data.img_url, img_data.img_out_name, dirURI.path, sauceUsername, sauceAccessKey);
                                    console.log("STEP INFO")
                                    console.log(data.step_data);
                                    full_data.all_steps.push(data.step_data);
                                }
                            }
                            else if (data.header === "Done") {
                                if (full_data.all_steps.length > 0) {
                                    const encoder = new TextEncoder();
                                    const uint8Array = encoder.encode(JSON.stringify(full_data));
                                    console.log("Output data.json");
                                    console.log(outputURI.path);
                                    vscode.workspace.fs.writeFile(outputURI, uint8Array);
                                    observer.next(full_data);
                                }
                                var finished_flag: any = {
                                    "finished": true
                                };
                                observer.next(finished_flag);
                            } else {
                                observer.next(data);
                            }
                        } 
                    }
                }
                var finished_flag: any = {
                    "finished": true
                };
                observer.next(finished_flag);
            }
        }).catch((err: Error) => {
            observer.error(err?.message);
        });
    });
}


/**
 * Checks if an image is already downloaded, if not downloads from test url.
 * @param imgURL url to screenshot from job .
 * @param img_out_name name of local file.
 * @param curr_img_dir name of the dir to output the image into.
 * @param sauceUsername sauce labs username.
 * @param sauceAccessKey sauce labs access key.
 * @returns 
 */
export async function downloadImage(imgURL: any, img_out_name: any, curr_img_dir: any, sauceUsername: string, sauceAccessKey: string) {
    const localURLFName = curr_img_dir + "/" + img_out_name;

    let x = 0;
    while (!existsSync(localURLFName) && x < 10) {
        if (x > 0) {
            console.log("Try downloading again");
            await new Promise(f => setTimeout(f, 1000));
        }
        try {
            const streamPipeline = promisify(pipeline);
            const response : any = await fetch(imgURL,
                {
                    'headers':
                    {
                        'Authorization': 'Basic ' + btoa(sauceUsername + ':' + sauceAccessKey)
                    }});

            if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

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


/**
 * Create asnyc request to ScriptIQ api and gets stream.
 * @param data previously run test.
 */
export function resendGeneratedTest(data: any, storagePath: any): Observable<string> {

    return new Observable<string>(observer => {
        console.log(`${storagePath.path}/${data.testID}/data.json`);
        const jsonString = fs.readFileSync(`${storagePath.path}/${data.testID}/data.json`, 'utf-8');
        const jsonData = JSON.parse(jsonString);
        observer.next(jsonData);
    });
}

/**
 * Create asnyc request to ScriptIQ api and gets stream.
 * @param rating provided by user.
 * @param step_num that user rated.
 * @param job_id id of the job they are rating.
 */
export function sendUserRatingAPI(rating: string, step_num: number, test_record: any) {
    fetch(`${scriptiqServer}/gather_user_rating`, {
        method: 'POST',
        body: JSON.stringify({
            rating: rating,
            step_num: step_num,
            test_record: test_record
        }),
        headers: {
            'Content-Type': 'application/json'
        },
    });
}
