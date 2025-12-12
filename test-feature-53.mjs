const API_BASE = 'http://localhost:3000/api';

async function testFeature53() {
  console.log('\n=== Testing Feature #53: Revoke shared conversation link ===\n');

  try {
    // Step 1: Get first conversation
    console.log('Step 1: Fetching conversations...');
    const convsResp = await fetch(`${API_BASE}/conversations`);
    const conversations = await convsResp.json();
    console.log(`Found ${conversations.length} conversations`);

    if (conversations.length === 0) {
      console.error('ERROR: No conversations found');
      return false;
    }

    const conversationId = conversations[0].id;
    console.log(`Using conversation ID: ${conversationId} - "${conversations[0].title}"`);

    // Step 2: Create a share link
    console.log('\nStep 2: Creating share link...');
    const shareResp = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const shareData = await shareResp.json();
    const shareToken = shareData.share_token;
    const shareUrl = `http://localhost:5173/share/${shareToken}`;
    console.log(`✓ Share token created: ${shareToken}`);
    console.log(`✓ Share URL: ${shareUrl}`);

    // Step 3: Verify share link works
    console.log('\nStep 3: Verifying share link works...');
    const verifyResp = await fetch(`${API_BASE}/share/${shareToken}`);
    if (verifyResp.ok) {
      const shareContent = await verifyResp.json();
      console.log(`✓ Share link works! Conversation: "${shareContent.conversation?.title || 'N/A'}"`);
    } else {
      console.error(`✗ Share link failed with status: ${verifyResp.status}`);
      return false;
    }

    // Step 4: Revoke the share link
    console.log('\nStep 4: Revoking share link...');
    const revokeResp = await fetch(`${API_BASE}/share/${shareToken}`, {
      method: 'DELETE'
    });
    if (revokeResp.ok) {
      console.log('✓ Share link revoked successfully');
    } else {
      console.error(`✗ Revoke failed with status: ${revokeResp.status}`);
      return false;
    }

    // Step 5: Verify share link no longer works
    console.log('\nStep 5: Verifying share link is revoked...');
    const verifyRevokedResp = await fetch(`${API_BASE}/share/${shareToken}`);
    if (verifyRevokedResp.status === 404) {
      console.log('✓ Share link correctly returns 404 (access denied)');
    } else {
      console.error(`✗ Expected 404, got: ${verifyRevokedResp.status}`);
      return false;
    }

    console.log('\n=== ALL BACKEND TESTS PASSED! ===\n');
    console.log('Share URL for UI testing:', shareUrl);
    console.log('Note: This URL should now return 404 or "not found"\n');

    return true;

  } catch (error) {
    console.error('ERROR:', error.message);
    return false;
  }
}

testFeature53().then(success => {
  process.exit(success ? 0 : 1);
});
