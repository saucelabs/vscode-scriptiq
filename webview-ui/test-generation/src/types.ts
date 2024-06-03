import { TestRecord, Vote } from './../../../src/types';

export type PostedMessage =
  | { action: 'update-test-progress'; data: { status_message: string } }
  | { action: 'show-new-test-record'; data: TestRecord }
  | {
      action: 'show-test-record';
      data: { testRecord: TestRecord; votes: Vote[] };
    };
