import { Memento } from './memento';

// Placeholder for data migration:
// For now, simply remove the logged test_id from Memento while leaving the files intact on the disk.
// Future updates should implement migration logic here and adjust related configurations accordingly.
export function migration(memento: Memento) {
  memento.saveHistory([]);
}
