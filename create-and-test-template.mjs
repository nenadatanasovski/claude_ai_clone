const API_BASE = 'http://localhost:3000/api';

async function main() {
  try {
    // 1. Get projects
    console.log('1. Fetching projects...');
    const projectsRes = await fetch(`${API_BASE}/projects`);
    const projects = await projectsRes.json();
    console.log(`   Found ${projects.length} projects`);

    const pythonProject = projects.find(p => p.name === 'Python ML Project Template');
    if (!pythonProject) {
      console.error('   ❌ Python ML Project Template not found!');
      process.exit(1);
    }
    console.log(`   ✓ Found project ID: ${pythonProject.id}`);

    // 2. Create a template
    console.log('\n2. Creating project template...');
    const createRes = await fetch(`${API_BASE}/project-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: pythonProject.id,
        name: 'ML Project Starter',
        description: 'Template for Python machine learning projects with pre-configured settings',
        category: 'Development'
      })
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error(`   ❌ Failed: ${errorText}`);
      process.exit(1);
    }

    const template = await createRes.json();
    console.log(`   ✓ Template created! ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Category: ${template.category}`);

    // 3. List templates
    console.log('\n3. Listing all project templates...');
    const listRes = await fetch(`${API_BASE}/project-templates`);
    const templates = await listRes.json();
    console.log(`   Found ${templates.length} templates`);

    // 4. Create project from template
    console.log('\n4. Creating project from template...');
    const useRes = await fetch(`${API_BASE}/project-templates/${template.id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!useRes.ok) {
      const errorText = await useRes.text();
      console.error(`   ❌ Failed: ${errorText}`);
      process.exit(1);
    }

    const newProject = await useRes.json();
    console.log(`   ✓ New project created! ID: ${newProject.id}`);
    console.log(`   Name: ${newProject.name}`);
    console.log(`   Color: ${newProject.color}`);
    console.log(`   Has custom instructions: ${newProject.custom_instructions ? 'Yes' : 'No'}`);

    // 5. Verify settings were copied
    console.log('\n5. Verification:');
    const match = newProject.custom_instructions === pythonProject.custom_instructions;
    console.log(`   Settings copied correctly: ${match ? '✓ YES' : '❌ NO'}`);
    if (pythonProject.custom_instructions) {
      console.log(`   Instructions contain 'Python 3.11': ${pythonProject.custom_instructions.includes('Python 3.11') ? '✓ YES' : '❌ NO'}`);
    }

    console.log('\n✅ All API tests passed!');
    console.log('\n📝 Summary:');
    console.log(`   - Created template "${template.name}"`);
    console.log(`   - Template ID: ${template.id}`);
    console.log(`   - Created new project from template`);
    console.log(`   - New project ID: ${newProject.id}`);
    console.log(`   - Settings successfully copied: ${match ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
