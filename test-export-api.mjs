async function testExportAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/export/full-data');

    if (!response.ok) {
      console.log('Response not OK:', response.status, response.statusText);
      return;
    }

    const data = await response.json();

    console.log('✅ Export API works!');
    console.log('\nExport metadata:', data.export_metadata);
    console.log('\nData structure keys:', Object.keys(data));
    console.log('\nStatistics:', data.statistics);
    console.log('\nUser info:', {
      id: data.user?.id,
      email: data.user?.email,
      name: data.user?.name
    });
    console.log('\nConversations count:', data.conversations?.length || 0);

    if (data.conversations && data.conversations.length > 0) {
      console.log('First conversation:', {
        id: data.conversations[0].id,
        title: data.conversations[0].title,
        messages: data.conversations[0].messages?.length || 0
      });
    }

    console.log('\n✅ All data exported successfully!');
    console.log('Total export size:', JSON.stringify(data).length, 'bytes');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExportAPI();
