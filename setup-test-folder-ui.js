// Setup a folder for UI testing
const API_BASE = 'http://localhost:3001/api';

async function setup() {
  // Create folder
  const folderResponse = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UI Test Folder', project_id: null })
  });
  const folder = await folderResponse.json();

  // Get a conversation
  const convsResponse = await fetch(`${API_BASE}/conversations`);
  const conversations = await convsResponse.json();
  const conv = conversations[0];

  // Add to folder
  await fetch(`${API_BASE}/folders/${folder.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conv.id })
  });

  console.log(`Created folder "${folder.name}" (ID: ${folder.id}) with conversation ${conv.id}`);
  console.log(`Now reload browser and right-click the folder to test deletion`);
}

setup().catch(console.error);
