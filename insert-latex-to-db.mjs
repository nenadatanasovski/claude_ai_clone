// Directly insert LaTeX message into SQLite database
import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');

const mathContent = `Here are some mathematical formulas demonstrating LaTeX rendering:

## Quadratic Formula

The quadratic formula is used to solve equations of the form $ax^2 + bx + c = 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Pythagorean Theorem

For a right triangle with sides $a$ and $b$, and hypotenuse $c$:

$$a^2 + b^2 = c^2$$

## Calculus - Derivative

The derivative of $f(x) = x^n$ is:

$$\\frac{d}{dx}(x^n) = nx^{n-1}$$

These are inline equations: The area of a circle is $A = \\pi r^2$ and the circumference is $C = 2\\pi r$.

## Summation

The sum of the first $n$ natural numbers:

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$`;

try {
  // Create conversation
  const insertConv = db.prepare(`
    INSERT INTO conversations (user_id, title, model, created_at, updated_at, last_message_at)
    VALUES (1, ?, 'claude-sonnet-4-5', datetime('now'), datetime('now'), datetime('now'))
  `);

  const result = insertConv.run('LaTeX Math Equations');
  const convId = result.lastInsertRowid;

  console.log('✅ Created conversation ID:', convId);

  // Insert user message
  const insertMsg = db.prepare(`
    INSERT INTO messages (conversation_id, role, content, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  insertMsg.run(convId, 'user', 'Show me some mathematical formulas');
  console.log('✅ Inserted user message');

  // Insert assistant message with LaTeX
  insertMsg.run(convId, 'assistant', mathContent);
  console.log('✅ Inserted assistant message with LaTeX content');

  console.log('\n🔗 Open http://localhost:5173 and click on "LaTeX Math Equations"');

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
