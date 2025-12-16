# Branch System Analysis - Comprehensive Debug Document

## Overview

This document analyzes the branching/conversation system issues. The system has a tree-based message structure where:
- Each message has a `parent_message_id` pointing to its predecessor
- Branches occur when multiple messages share the same parent
- The path from any message to root defines the conversation history for that branch

---

## Issue 1: Initial Prompt Not Displayed Until Refresh

### Symptom
When starting a new conversation and sending the first message, the user's prompt doesn't appear in the UI until the page is manually refreshed.

### Analysis Points

#### 1.1 Frontend: sendMessage() - Optimistic UI Update
**File**: `src/App.jsx` - `sendMessage()` function (~line 2574)

**Questions to investigate**:
- Is the user message being added to `messages` state immediately?
- Is the temporary message ID being used correctly?
- Is there a race condition between adding the message and the streaming response?

**Code to examine**:
```javascript
// Around line 2600-2608
const userMessage = {
  id: Date.now(),  // Temporary ID
  role: 'user',
  content: messageText,
  images: selectedImages.length > 0 ? selectedImages : null,
  created_at: new Date().toISOString()
}
setMessages(prev => [...prev, userMessage])  // <-- Is this firing?
```

**Potential culprits**:
- [ ] `setMessages` not being called
- [ ] `messages` state not triggering re-render
- [ ] Conditional rendering hiding the message
- [ ] Key prop issues causing React to not render

#### 1.2 Frontend: New Conversation Creation
**File**: `src/App.jsx` - conversation creation in `sendMessage()`

**Questions to investigate**:
- When creating a new conversation, is `currentConversationId` being set before `setMessages`?
- Is there a useEffect that clears messages when `currentConversationId` changes?

**Code to examine**:
```javascript
// Around line 2588-2598
if (!conversationId) {
  // Create new conversation
  const response = await fetch(...)
  const newConversation = await response.json()
  conversationId = newConversation.id
  setCurrentConversationId(conversationId)  // <-- Does this trigger message clear?
  setConversations(prev => [newConversation, ...prev])
}
```

**Potential culprits**:
- [ ] The useEffect at line 1262-1281 clears messages AND stops streaming when `currentConversationId` changes
- [ ] Setting `currentConversationId` triggers `loadMessages()` which might clear the optimistic update
- [ ] Race condition: optimistic message added, then `loadMessages()` overwrites with empty array

#### 1.3 The useEffect That Clears Messages
**File**: `src/App.jsx` - lines 1262-1281

```javascript
useEffect(() => {
  // Stop streaming...
  if (currentConversationId) {
    loadMessages(currentConversationId)  // <-- This might overwrite optimistic updates
  } else {
    setMessages([])
  }
}, [currentConversationId])
```

**Critical Issue**: When `setCurrentConversationId(newId)` is called in `sendMessage()`, this useEffect fires and calls `loadMessages()`. But `loadMessages()` fetches from the server - if the message hasn't been saved yet (still streaming), it returns empty or stale data.

---

## Issue 2: Branch Edit Shows Everything Previously Prompted

### Symptom
When editing a prompt and creating a branch, the AI response includes content from the original conversation path, not just the new branch.

### Analysis Points

#### 2.1 Server: /messages/:id/respond - History Building
**File**: `server/server.js` - lines 1922-2038

**Questions to investigate**:
- How is the conversation history built for the AI?
- Is it correctly tracing parent_message_id?
- Does it include ONLY the branch path?

**Code to examine**:
```javascript
// Lines 1943-1966
const allMessages = dbHelpers.prepare(`
  SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC
`).all(userMessage.conversation_id);

// Build path from this message back to root
const pathIds = new Set();
let current = parseInt(messageId);
while (current) {
  pathIds.add(current);
  current = parentById[current];
}

// Get messages in the path
const history = allMessages
  .filter(msg => pathIds.has(msg.id))
  .map(msg => ({ role: msg.role, content: msg.content }));
```

**Potential culprits**:
- [ ] `parentById[current]` might return undefined due to type mismatch (string vs number)
- [ ] The `pathIds` set might not be built correctly
- [ ] `allMessages` includes messages from all branches - filtering might not work

#### 2.2 Server: Message Creation on Branch Edit
**File**: `server/server.js` - PUT /messages/:id - lines 1847-1919

**Questions to investigate**:
- When a branch is created, what is the `parent_message_id` of the new message?
- Is it correctly set to the SAME parent as the original message?

**Code to examine**:
```javascript
// Lines 1882-1891
const newMessage = dbHelpers.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at, parent_message_id)
  VALUES (?, ?, ?, ?, ?)
`).run(
  message.conversation_id,
  message.role,
  content,
  now,
  message.parent_message_id  // <-- Using ORIGINAL message's parent
);
```

**This looks correct** - the new branch message gets the same parent as the message being edited.

#### 2.3 Type Coercion Issues
**Critical Investigation**:
- Database might return IDs as strings or numbers inconsistently
- JavaScript `===` comparison fails if types don't match
- `parseInt()` and `Number()` handling

**Code to check**:
```javascript
current = parentById[current];  // What if parentById keys are strings but current is number?
pathIds.has(msg.id)  // What if msg.id is string but pathIds contains numbers?
```

---

## Issue 3: New Prompts Output All Previous Prompts

### Symptom
When sending a new message (not branch edit), the AI response includes content from ALL previous messages, including from other branches. The history "snowballs".

### Analysis Points

#### 3.1 Frontend: parentMessageId Not Being Sent
**File**: `src/App.jsx` - sendMessage() - lines 2613-2622

**Current fix** (may not be working):
```javascript
const lastMessageInView = messages.length > 0 ? messages[messages.length - 1] : null
const messagePayload = {
  content: messageText,
  role: 'user',
  parentMessageId: lastMessageInView?.id || null
}
```

**Questions to investigate**:
- Is `messages` array populated at this point?
- Is `lastMessageInView?.id` a valid message ID?
- Is the server receiving this value?

#### 3.2 Server: Using parentMessageId
**File**: `server/server.js` - POST /conversations/:id/messages - lines 727-740

**Current fix**:
```javascript
let parentMessageId = req.body.parentMessageId || null;

if (!parentMessageId) {
  // Fallback to highest ID
  const lastMessage = dbHelpers.prepare(`...ORDER BY id DESC LIMIT 1`).get(conversationId);
  parentMessageId = lastMessage ? lastMessage.id : null;
}
```

**Questions to investigate**:
- Is `req.body.parentMessageId` being received? (Check server logs)
- Is the fallback being triggered when it shouldn't be?

#### 3.3 Server: History Building for Claude API
**File**: `server/server.js` - lines 1109-1140

**Current code**:
```javascript
// Build path from the new user message back to root
const pathIds = new Set();
let current = userMessage.id;
while (current) {
  pathIds.add(current);
  current = parentById[current];
}

const history = allMessages
  .filter(msg => pathIds.has(msg.id))
  .map(msg => ({...}));
```

**Critical Questions**:
- Does `userMessage` have the correct `parent_message_id`?
- Is the while loop correctly traversing the parent chain?
- What happens if `parent_message_id` is null vs undefined vs 0?

#### 3.4 Database Schema Check
**Questions to investigate**:
- What is the actual data in the `parent_message_id` column?
- Are there any NULL vs 0 vs '' issues?
- Are message IDs consistent types?

**SQL to run for debugging**:
```sql
SELECT id, role, parent_message_id, typeof(parent_message_id), typeof(id)
FROM messages
WHERE conversation_id = [ID]
ORDER BY id;
```

---

## Issue 4: Branch Navigation Removes Conversations Below

### Symptom
When clicking branch numbers, messages below the branch point disappear. Specifically:
- Clicking on branch numbers at the top doesn't remove content below
- Clicking on branch numbers lower in the conversation removes content below

### Analysis Points

#### 4.1 Server: GET /conversations/:id/messages - Path Building
**File**: `server/server.js` - lines 607-689

**The algorithm**:
1. Build `targetPath` set from branchId back to root
2. Start from 'root', follow children
3. At each level, prefer child in targetPath, else pick highest ID
4. **Continue until no more children**

**Code to examine**:
```javascript
while (childrenByParent[currentParent] && childrenByParent[currentParent].length > 0) {
  const children = childrenByParent[currentParent];
  let nextMessage;

  if (targetPath) {
    nextMessage = children.find(msg => targetPath.has(msg.id));
  }

  if (!nextMessage) {
    nextMessage = children.reduce((latest, msg) => msg.id > latest.id ? msg : latest);
  }

  activePath.push(nextMessage);
  currentParent = nextMessage.id;
}
```

**Critical Issue**: The algorithm follows the path TO the target message, then continues with highest ID children. But what if the target message has NO children? The path stops there.

**Example**:
```
Msg1 (root)
├── Msg2 "poem" (branch 1)
│   └── Msg3 (AI poem)
│       └── Msg4 (follow-up)
│           └── Msg5 (AI follow-up)
└── Msg6 "svg" (branch 2)
    └── Msg7 (AI svg)
```

If you click branch 1 (Msg2) while viewing branch 2:
- targetPath = {2, 1}
- Start at root, pick Msg1
- Children of 1: [Msg2, Msg6]. Pick Msg2 (in targetPath)
- Children of 2: [Msg3]. Pick Msg3 (not in targetPath, but only option)
- Children of 3: [Msg4]. Pick Msg4
- Continue...

This should work. But what if clicking branch 2 while viewing branch 1?
- targetPath = {6, 1}
- Start at root, pick Msg1
- Children of 1: [Msg2, Msg6]. Pick Msg6 (in targetPath)
- Children of 6: [Msg7]. Pick Msg7
- Children of 7: none. STOP.

**Result**: Path is [Msg1, Msg6, Msg7] - only 3 messages! This is correct for branch 2.

**BUT** the issue might be that the branch indicator is shown on the WRONG message, or the user expects to see MORE content.

#### 4.2 Understanding Expected Behavior
**Key Question**: When you click a branch number, what SHOULD happen?

- **Current behavior**: Load the entire path for that branch (from root to latest message in that branch)
- **User expectation**: ???

#### 4.3 Frontend: Branch UI Rendering
**File**: `src/App.jsx` - lines 5476-5512

**Code**:
```javascript
const messageBranch = branches.find(b =>
  b.branches.some(branch => branch.messageId === message.id)
)
```

**This shows branch indicator on messages that ARE branches**, not on the parent. So if Msg2 and Msg6 are siblings, the branch indicator appears on Msg2 when viewing branch 1, and on Msg6 when viewing branch 2.

---

## Core Mechanisms That Must Work Together

### Mechanism 1: Message Parent Chain
```
Every message.parent_message_id must correctly point to its predecessor in the conversation.
```
- New messages must get parent = last message in CURRENT VIEW
- Branch edits must get parent = original message's parent
- First message in conversation must get parent = null

### Mechanism 2: Path Building (Server)
```
Given a target message, build the path from root to that message, then continue to the end of that branch.
```
- Must correctly trace parent_message_id chain
- Must handle type coercion (string vs number IDs)
- Must continue PAST the target message to include descendants

### Mechanism 3: History Building (Server)
```
Given a user message, build conversation history for Claude by tracing parent chain to root.
```
- Must ONLY include messages in the current branch path
- Must NOT include messages from other branches
- Must handle type coercion correctly

### Mechanism 4: UI State Management (Frontend)
```
Messages displayed must match the current branch being viewed.
```
- Optimistic updates must not be overwritten
- Switching conversations must not race with message creation
- Branch switching must preserve scroll position

---

## Debugging Checklist

### For Each Issue, Verify:

1. **Database integrity**
   - [ ] All messages have correct parent_message_id
   - [ ] No orphaned messages
   - [ ] Consistent ID types

2. **Server logging** - Add logs for:
   - [ ] Received parentMessageId in POST /messages
   - [ ] Built pathIds set for history
   - [ ] Final history array sent to Claude
   - [ ] Messages returned for branch loading

3. **Frontend logging** - Add logs for:
   - [ ] parentMessageId being sent
   - [ ] messages array state changes
   - [ ] When useEffects fire
   - [ ] What loadMessages returns

4. **Type consistency**
   - [ ] All ID comparisons use consistent types
   - [ ] parseInt() used where needed
   - [ ] Set.has() receives correct type

---

## Recommended Fix Approach

### Step 1: Add Comprehensive Logging
Before making changes, add logging to understand actual data flow:

```javascript
// Server - POST /messages
console.log('[POST /messages] parentMessageId from request:', req.body.parentMessageId);
console.log('[POST /messages] Saving message with parent:', parentMessageId);

// Server - History building
console.log('[History] Building path from message:', userMessage.id);
console.log('[History] pathIds:', Array.from(pathIds));
console.log('[History] Final history length:', history.length);
console.log('[History] History messages:', history.map(h => h.role + ': ' + h.content.substring(0, 50)));
```

### Step 2: Fix Type Coercion
Ensure all ID comparisons use consistent types:

```javascript
// When building parentById
parentById[msg.id] = msg.parent_message_id ? parseInt(msg.parent_message_id) : null;

// When tracing path
let current = parseInt(messageId);
while (current) {
  pathIds.add(current);
  const parent = parentById[current];
  current = parent ? parseInt(parent) : null;
}

// When filtering
const history = allMessages.filter(msg => pathIds.has(parseInt(msg.id)));
```

### Step 3: Fix Race Condition in New Conversation
Don't trigger loadMessages when creating a new conversation within sendMessage:

```javascript
// Option A: Don't set currentConversationId until after message is sent
// Option B: Add a flag to skip the useEffect during creation
// Option C: Move conversation creation outside sendMessage
```

### Step 4: Verify Branch Path Includes Descendants
The server's GET /messages endpoint must continue past the target message:

```javascript
// After finding target, continue following highest-ID children
// Current code does this, but verify it's working
```

---

## Test Cases

### Test 1: New Conversation First Message
1. Click New Chat
2. Send "Hello"
3. **Expected**: "Hello" appears immediately, AI responds
4. **Verify**: No page refresh needed

### Test 2: Branch Edit History
1. Send "Write a poem"
2. AI responds with poem
3. Edit prompt to "Draw an SVG"
4. **Expected**: AI responds with ONLY SVG, no poem reference
5. **Verify**: Server history log shows only [user: "Draw an SVG"]

### Test 3: New Message on Branch
1. Create conversation with poem (branch 1)
2. Edit to create SVG branch (branch 2)
3. Switch to branch 2
4. Send new message "Make it blue"
5. **Expected**: AI modifies SVG, doesn't mention poem
6. **Verify**: parentMessageId = last message in SVG branch

### Test 4: Branch Navigation
1. Create branches at different levels
2. Click various branch numbers
3. **Expected**: Full branch path loads, including all descendants
4. **Verify**: Messages array contains complete path

---

## Files to Examine

| File | Lines | Purpose |
|------|-------|---------|
| `server/server.js` | 607-689 | GET messages with branch |
| `server/server.js` | 691-1300 | POST messages (new message) |
| `server/server.js` | 1847-1919 | PUT messages (edit/branch) |
| `server/server.js` | 1922-2038 | POST respond (branch AI) |
| `server/server.js` | 2067-2116 | GET branches |
| `src/App.jsx` | 1262-1281 | useEffect for conversation change |
| `src/App.jsx` | 1508-1597 | loadMessages function |
| `src/App.jsx` | 2574-2800 | sendMessage function |
| `src/App.jsx` | 3404-3576 | saveEditedMessage function |
| `src/App.jsx` | 5476-5520 | Branch UI rendering |
