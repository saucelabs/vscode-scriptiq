import { Memento } from './memento';
import * as toast from './toast';

// Placeholder for data migration:
// Future updates should implement migration logic here and adjust related configurations accordingly.
export function migration(memento: Memento) {
  toast.showError(
    `Data model version changed: previous test records outdated and can't be loaded. You can still create new records.`,
  );
  // For now, simply remove the logged test_id from Memento while leaving the files intact on the disk.
  memento.saveHistory([]);
}
