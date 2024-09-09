/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface Window {
  // window.historyPath is injected into the webview by the WebviewViewProvider
  historyPath: string;
  creds: string;
}
