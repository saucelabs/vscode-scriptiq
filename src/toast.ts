import { window } from 'vscode';

/**
 * Display an error message as toast.
 * Syntax sugar for `window.showErrorMessage`.
 */
export function showError<T extends string>(message: string, ...items: T[]) {
  window.showErrorMessage<T>(message, ...items);
}

/**
 * Display an info message as toast.
 * Syntax sugar for `window.showInformationMessage`.
 */
export function showInfo<T extends string>(message: string, ...items: T[]) {
  window.showInformationMessage<T>(message, ...items);
}

/**
 * Display a warning message as toast.
 * Syntax sugar for `window.showWarningMessage`.
 */
export function showWarn<T extends string>(message: string, ...items: T[]) {
  window.showWarningMessage<T>(message, ...items);
}
