export function errMsg(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return '';
  }

  if (isError(obj)) {
    let msg = obj.message;

    if (obj.cause) {
      msg += `: ${errMsg(obj.cause)}`;
    }

    // Checking if AggregateError.
    if ('errors' in obj && Array.isArray(obj.errors) && obj.errors.length > 0) {
      // Show only the first error, because retries can cause repeated errors.
      msg += `: ${errMsg(obj.errors[0])}`;
    }

    return msg;
  }

  return JSON.stringify(obj);
}

export function isError(obj: unknown): obj is Error {
  return typeof obj === 'object' && obj !== null && 'message' in obj;
}
