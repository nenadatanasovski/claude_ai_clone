// Insert a math message directly into the database
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

These are inline equations: The area of a circle is $A = \\pi r^2$ and the circumference is $C = 2\\pi r$.`;

// Create conversation
const convResp = await fetch('http://localhost:3001/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Math LaTeX Test' })
});

const conv = await convResp.json();
console.log('Created conversation ID:', conv.id);

// Insert user message
const userResp = await fetch(`http://localhost:3001/api/conversations/${conv.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'user',
    content: 'Show me some mathematical formulas'
  })
});

// Read the streaming response (consume it but don't care about content)
await userResp.body.cancel();

// Now directly insert the assistant message with LaTeX
const assistantResp = await fetch(`http://localhost:3001/api/conversations/${conv.id}/messages/direct`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'assistant',
    content: mathContent
  })
});

if (assistantResp.ok) {
  const result = await assistantResp.json();
  console.log('✅ Inserted math message successfully');
  console.log('📝 Conversation ID:', conv.id);
  console.log('🔗 Open in browser: http://localhost:5173');
  console.log('   Then click on "Math LaTeX Test" conversation');
} else {
  // If direct endpoint doesn't exist, that's okay - we'll create it
  console.log('⚠️  Direct message endpoint not available');
  console.log('📝 Conversation ID:', conv.id);
  console.log('   Will need to modify server to add direct message insert');
}
