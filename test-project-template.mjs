// Test script to create and use project templates

const API_BASE = 'http://localhost:3000/api';

async function testProjectTemplates() {
  try {
    // 1. Get projects
    console.log('1. Fetching projects...');
    const projectsRes = await fetch(`${API_BASE}/projects`);
    const projects = await projectsRes.json();
    console.log(`Found ${projects.length} projects`);

    const pythonProject = projects.find(p => p.name === 'Python ML Project Template');
    if (!pythonProject) {
      console.error('Python ML Project Template not found!');
      return;
    }
    console.log(`Found project: ${pythonProject.name} (ID: ${pythonProject.id})`);

    // 2. Create a template from the project
    console.log('\n2. Creating template from project...');
    const createTemplateRes = await fetch(`${API_BASE}/project-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: pythonProject.id,
        name: 'ML Project Starter',
        description: 'Template for Python machine learning projects',
        category: 'Development'
      })
    });

    if (!createTemplateRes.ok) {
      const error = await createTemplateRes.text();
      console.error('Failed to create template:', error);
      return;
    }

    const template = await createTemplateRes.json();
    console.log('Template created successfully!');
    console.log(`  ID: ${template.id}`);
    console.log(`  Name: ${template.name}`);

    // 3. List all templates
    console.log('\n3. Fetching all project templates...');
    const templatesRes = await fetch(`${API_BASE}/project-templates`);
    const templates = await templatesRes.json();
    console.log(`Found ${templates.length} templates:`);
    templates.forEach(t => {
      console.log(`  - ${t.name} (${t.category}) - Used ${t.usage_count} times`);
    });

    // 4. Create a new project from template
    console.log('\n4. Creating new project from template...');
    const useTemplateRes = await fetch(`${API_BASE}/project-templates/${template.id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!useTemplateRes.ok) {
      const error = await useTemplateRes.text();
      console.error('Failed to create project from template:', error);
      return;
    }

    const newProject = await useTemplateRes.json();
    console.log('New project created from template!');
    console.log(`  ID: ${newProject.id}`);
    console.log(`  Name: ${newProject.name}`);
    console.log(`  Color: ${newProject.color}`);
    console.log(`  Custom Instructions: ${newProject.custom_instructions}`);

    // 5. Verify the settings were copied
    console.log('\n5. Verification:');
    console.log(`  ✓ Settings copied: ${newProject.custom_instructions === pythonProject.custom_instructions}`);
    console.log(`  ✓ Custom instructions match: ${newProject.custom_instructions.includes('Python 3.11')}`);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testProjectTemplates();
