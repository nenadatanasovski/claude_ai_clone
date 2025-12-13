const API_BASE = 'http://localhost:3000/api';

async function main() {
  try {
    // 1. Get conversations
    console.log('1. Fetching conversations...');
    const conversationsRes = await fetch(`${API_BASE}/conversations`);
    const conversations = await conversationsRes.json();
    console.log(`   Found ${conversations.length} conversations`);

    if (conversations.length === 0) {
      console.error('   ❌ No conversations found!');
      process.exit(1);
    }

    const conversationId = conversations[0].id;
    console.log(`   Using conversation ID: ${conversationId}`);

    // 2. Send a message requesting a Mermaid diagram
    console.log('\n2. Sending message requesting Mermaid diagram...');
    const messageRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Please create a simple Mermaid flowchart'
      })
    });

    if (!messageRes.ok) {
      const errorText = await messageRes.text();
      console.error(`   ❌ Failed: ${errorText}`);
      process.exit(1);
    }

    const message = await messageRes.json();
    console.log(`   ✓ Message created! ID: ${message.userMessage.id}`);
    console.log(`   ✓ Assistant response ID: ${message.assistantMessage.id}`);

    // 3. Get artifacts for the conversation
    console.log('\n3. Fetching artifacts...');
    const artifactsRes = await fetch(`${API_BASE}/conversations/${conversationId}/artifacts`);
    const artifacts = await artifactsRes.json();
    console.log(`   Found ${artifacts.length} artifacts`);

    const mermaidArtifacts = artifacts.filter(a => a.type === 'mermaid');
    console.log(`   Mermaid artifacts: ${mermaidArtifacts.length}`);

    if (mermaidArtifacts.length > 0) {
      console.log('\n✅ Mermaid artifact detected!');
      console.log(`   Type: ${mermaidArtifacts[0].type}`);
      console.log(`   Language: ${mermaidArtifacts[0].language}`);
      console.log(`   Title: ${mermaidArtifacts[0].title}`);
      console.log(`   Content preview: ${mermaidArtifacts[0].content.substring(0, 50)}...`);
    } else {
      console.log('\n⚠️  No Mermaid artifacts found in response');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
