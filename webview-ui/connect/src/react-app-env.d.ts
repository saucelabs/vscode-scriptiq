/// <reference types="react-scripts" />

interface Credentials {
  username: string;
  accessKey: string;
  region: string;
}

interface Window {
  // window.creds is injected into the webview by the WebviewViewProvider
  creds: string;
}
