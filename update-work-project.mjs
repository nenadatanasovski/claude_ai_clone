// Update Work project custom instructions
const API_BASE = 'http://localhost:3001/api';

async function updateWorkProject() {
  try {
    // Get all projects
    const response = await fetch(`${API_BASE}/projects`);
    const projects = await response.json();

    // Find the Work project
    const workProject = projects.find(p => p.name === 'Work');

    if (!workProject) {
      console.log('Work project not found. Creating it...');

      // Create the Work project
      const createResponse = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Work',
          description: 'Work-related conversations',
          custom_instructions: 'Be professional'
        })
      });

      const newProject = await createResponse.json();
      console.log('Created Work project:', newProject);
      return;
    }

    console.log('Found Work project:', workProject.id);

    // Update custom instructions
    const updateResponse = await fetch(`${API_BASE}/projects/${workProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_instructions: 'Be professional'
      })
    });

    const updated = await updateResponse.json();
    console.log('Updated Work project custom instructions:', updated);

  } catch (error) {
    console.error('Error:', error);
  }
}

updateWorkProject();
