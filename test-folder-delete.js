// Test script to create folder with conversation and then test deletion
const API_BASE = 'http://localhost:3001/api';

async function testFolderDelete() {
  try {
    // Step 1: Create a folder
    console.log('\n=== Step 1: Creating folder ===');
    const folderResponse = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Delete Folder', project_id: null })
    });
    const folder = await folderResponse.json();
    console.log('Created folder:', folder);
    const folderId = folder.id;

    // Step 2: Get an existing conversation
    console.log('\n=== Step 2: Getting conversations ===');
    const convsResponse = await fetch(`${API_BASE}/conversations`);
    const conversations = await convsResponse.json();
    console.log(`Found ${conversations.length} conversations`);

    if (conversations.length === 0) {
      console.log('ERROR: No conversations found. Creating one...');
      const newConvResponse = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Conversation' })
      });
      const newConv = await newConvResponse.json();
      conversations.push(newConv);
    }

    const conversationId = conversations[0].id;
    console.log('Using conversation ID:', conversationId);

    // Step 3: Add conversation to folder
    console.log('\n=== Step 3: Adding conversation to folder ===');
    const addResponse = await fetch(`${API_BASE}/folders/${folderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId })
    });
    const addResult = await addResponse.json();
    console.log('Added to folder:', addResult);

    // Step 4: Verify folder has the conversation
    console.log('\n=== Step 4: Verifying folder contents ===');
    const itemsResponse = await fetch(`${API_BASE}/folders/${folderId}/items`);
    const items = await itemsResponse.json();
    console.log('Folder items:', items);

    console.log('\n✅ Setup complete!');
    console.log(`Folder ID: ${folderId}`);
    console.log(`Conversation ID: ${conversationId}`);
    console.log('\nNow test in browser: Right-click folder and delete it');

  } catch (error) {
    console.error('Error:', error);
  }
}

testFolderDelete();
