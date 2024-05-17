import { Region } from '../../types';

export function getWSServer(region: Region): string {
  if (process.env.NODE_ENV === 'development') {
    return 'ws://127.0.0.1:8000/v1';
  }
  return `wss://${getDomain(region)}/v1/scriptiq-llm`;
}

export function getHTTPServer(region: Region): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:8000/v1';
  }
  return `https://${getDomain(region)}/v1/scriptiq-llm`;
}

function getDomain(region: Region): string {
  switch (region) {
    case 'staging':
      return 'api.staging.saucelabs.net';
    default:
      return `api.${region}.saucelabs.com`;
  }
}
