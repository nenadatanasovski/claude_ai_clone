import { readFileSync, writeFileSync } from 'fs';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'claude.db');

async function addPythonArtifact() {
  try {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    const conversationId = 77;

    // Add Python artifact
    db.run(`
      INSERT INTO artifacts (conversation_id, message_id, type, title, identifier, language, content, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      conversationId,
      1,
      'code',
      'Python Hello World',
      'artifact_py_' + Date.now(),
      'python',
      `def hello_world():
    print('Hello, World!')
    return 'Hello, World!'

# Call the function
hello_world()`,
      1
    ]);

    // Save database
    const data = db.export();
    const buf = Buffer.from(data);
    writeFileSync(dbPath, buf);

    // Verify
    const check = db.exec(`SELECT id, title, type FROM artifacts WHERE conversation_id = ${conversationId}`);
    console.log('✅ Added Python artifact!');
    console.log('📊 Total artifacts in conversation 77:', check[0] ? check[0].values.length : 0);
    if (check[0]) {
      check[0].values.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID ${row[0]}: ${row[1]} (${row[2]})`);
      });
    }

    db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

addPythonArtifact();
