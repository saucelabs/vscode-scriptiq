import type { Credentials, TestRecord, Vote } from './../../../src/types';

export type PostedMessage =
  | { action: 'update-test-progress'; data: { status_message: string } }
  | { action: 'show-new-test-record'; data: TestRecord }
  | {
      action: 'show-test-record';
      data: { testRecord: TestRecord; votes: Vote[] };
    }
  | { action: 'clear' }
  | {
      action: 'show-video';
      data: {
        status_message: string;
        session_id: string;
      };
      credentials: Credentials;
    }
  | { action: 'recover-from-error' }
  | { action: 'finalize' };
