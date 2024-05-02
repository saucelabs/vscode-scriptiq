export function errMsg(obj: unknown): string {
  if (typeof obj === 'object' && obj !== null && 'message' in obj) {
    return (obj as Error).message;
  } else {
    return JSON.stringify(obj);
  }
}

export function isError(obj: unknown): obj is Error {
  return typeof obj === 'object' && obj !== null && 'message' in obj;
}
