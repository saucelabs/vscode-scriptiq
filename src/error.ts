export function errMsg(obj: unknown): string {
  if (isError(obj)) {
    return obj.message;
  } else {
    return JSON.stringify(obj);
  }
}

export function isError(obj: unknown): obj is Error {
  return typeof obj === 'object' && obj !== null && 'message' in obj;
}
