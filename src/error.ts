export function errMsg(obj: unknown): string {
  if (typeof obj === 'object' && obj !== null && 'message' in obj) {
    return (obj as Error).message;
  } else {
    return JSON.stringify(obj);
  }
}
