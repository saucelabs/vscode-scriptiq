import { fetch } from 'undici';

import { Credentials, Region, AppInfo } from '../types';
import { getDomain } from './llm/config';

export function getHTTPServer(region: Region): string {
  return `https://${getDomain(region)}/v1/storage/files`;
}

export async function getAppNames(creds: Credentials) {
  try {
    const resp = await fetch(`${getHTTPServer(creds.region)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(creds.username + ':' + creds.accessKey),
      },
    });
    const data = (await resp.json()) as { items: AppInfo[] };
    if (!resp.ok) {
      throw new Error('Unexpected status code: ' + resp.status);
    }
    return data.items;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error; // Re-throw the error to handle it elsewhere if needed
  }
}
