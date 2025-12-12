const Database = require('better-sqlite3');
const db = new Database('./server/chat.db');

const prompts = db.prepare('SELECT * FROM prompt_library').all();
console.log(JSON.stringify(prompts, null, 2));

db.close();
