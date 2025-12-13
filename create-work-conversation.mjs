// Create a new conversation in the Work project
const API_BASE = 'http://localhost:3001/api';

async function createWorkConversation() {
  try {
    // Get Work project
    const projectsResponse = await fetch(`${API_BASE}/projects`);
    const projects = await projectsResponse.json();
    const workProject = projects.find(p => p.name === 'Work');

    if (!workProject) {
      console.error('Work project not found');
      return;
    }

    console.log('Found Work project:', workProject.id);

    // Create new conversation in Work project
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: workProject.id,
        title: 'New Chat',
        model: 'claude-sonnet-4-20250514'
      })
    });

    const conversation = await response.json();
    console.log('Created conversation in Work project:', conversation);
    console.log('Conversation ID:', conversation.id);

  } catch (error) {
    console.error('Error:', error);
  }
}

createWorkConversation();
