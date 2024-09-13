import { fetch } from 'undici';

import { GlobalStorage } from '../../storage';
import { Credentials, Vote, isAppStorageFilesApiResponse } from '../../types';
import { getHTTPServer, getDomain } from './config';

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
  for (let attempt = 0; attempt < 15; attempt++) {
    if (attempt > 0) {
      console.log('Retrying image download...');
      await new Promise((f) => setTimeout(f, 3000));
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

export async function sendUserRating(
  votes: Vote[],
  testID: string,
  creds: Credentials,
) {
  const resp = await fetch(`${getHTTPServer(creds.region)}/submitFeedback`, {
    method: 'POST',
    body: JSON.stringify({
      test_id: testID,
      votes,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(creds.username + ':' + creds.accessKey),
    },
  });
  if (!resp.ok) {
    throw new Error('Unexpected status code: ' + resp.status);
  }
}

export async function fetchApps(creds: Credentials) {
  const response = await fetch(
    `https://${getDomain(creds.region)}/v1/storage/files?kind=ios&kind=android`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${creds.username}:${creds.accessKey}`),
      },
    },
  );

  if (!response.ok) {
    throw new Error('Network response was not ok: ' + response.status);
  }

  const data = await response.json();

  if (isAppStorageFilesApiResponse(data)) {
    return data.items;
  } else {
    throw new Error('Unexpected data format from API: ' + data);
  }
}
