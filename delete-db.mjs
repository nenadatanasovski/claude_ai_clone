import { unlinkSync } from 'fs';

try {
  unlinkSync('server/data/claude.db');
  console.log('Database deleted successfully');
} catch (err) {
  console.error('Error deleting database:', err.message);
}
