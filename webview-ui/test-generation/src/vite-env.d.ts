/// <reference types="vite/client" />

interface Window {
  // window.historyPath is injected into the webview by the WebviewViewProvider
  historyPath: string;
}
