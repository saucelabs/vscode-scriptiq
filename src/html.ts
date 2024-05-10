export function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * A tagged template that just passes through the templated string.
 * Useful for formatters/linters to identify the content of the string.
 * @param strings
 * @param values
 * @returns
 */
export function html(strings: string[] | ArrayLike<string>, ...values: any[]) {
  return String.raw({ raw: strings }, ...values);
}
