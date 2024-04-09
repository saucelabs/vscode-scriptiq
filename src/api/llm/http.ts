import { fetch } from 'undici';

import { GlobalStorage } from '../../storage';
import { TestRecord, Vote } from '../../types';

const scriptiqServer =
  process.env.SCRIPTIQ_API_SERVER || 'http://127.0.0.1:8000';

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

export async function sendUserRating(votes: Vote[], testRecord: TestRecord) {
  const resp = await fetch(`${scriptiqServer}/v1/submitFeedback`, {
    method: 'POST',
    body: JSON.stringify({
      votes,
      test_record: testRecord,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error('Unexpected status code: ' + resp.status);
  }
}
