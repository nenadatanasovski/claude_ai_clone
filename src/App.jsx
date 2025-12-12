import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

const API_BASE = 'http://localhost:3001/api'

function App() {
  const [isDark, setIsDark] = useState(false)
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const editInputRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId)
    } else {
      setMessages([])
    }
  }, [currentConversationId])

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE}/conversations`)
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`)
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      })
      const newConversation = await response.json()
      setConversations([newConversation, ...conversations])
      setCurrentConversationId(newConversation.id)
      setMessages([])
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) {
      return
    }

    const messageText = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    try {
      // Create conversation if none exists
      let conversationId = currentConversationId
      if (!conversationId) {
        const response = await fetch(`${API_BASE}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' })
        })
        const newConversation = await response.json()
        conversationId = newConversation.id
        setCurrentConversationId(conversationId)
        setConversations(prev => [newConversation, ...prev])
      }

      // Add user message to UI immediately
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: messageText,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      // Send message to API
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText, role: 'user' })
      })

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        // Handle streaming response
        setIsStreaming(true)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, assistantMessage])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'content') {
                  assistantMessage.content += data.text
                  setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = { ...assistantMessage }
                    return newMessages
                  })
                } else if (data.type === 'done') {
                  assistantMessage.id = data.messageId
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        setIsStreaming(false)
      } else {
        // Handle regular JSON response
        const data = await response.json()
        // Reload all messages from the database to ensure consistency
        await loadMessages(conversationId)
      }

      // Reload conversations to update the list
      loadConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestedPrompt = (prompt) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }

  const startEditingConversation = (conv, e) => {
    e.stopPropagation()
    setEditingConversationId(conv.id)
    setEditingTitle(conv.title)
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 10)
  }

  const saveConversationTitle = async (conversationId) => {
    if (!editingTitle.trim()) {
      setEditingConversationId(null)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      })

      if (response.ok) {
        // Update local state
        setConversations(conversations.map(conv =>
          conv.id === conversationId ? { ...conv, title: editingTitle.trim() } : conv
        ))
      }
    } catch (error) {
      console.error('Error updating conversation title:', error)
    } finally {
      setEditingConversationId(null)
    }
  }

  const handleTitleKeyDown = (e, conversationId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveConversationTitle(conversationId)
    } else if (e.key === 'Escape') {
      setEditingConversationId(null)
    }
  }

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation()

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setConversations(conversations.filter(conv => conv.id !== conversationId))

        // If the deleted conversation was active, clear the current conversation
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation. Please try again.')
    }
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Claude</h1>
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}Dark
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-60px)]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
            <button
              type="button"
              onClick={createNewConversation}
              className="w-full bg-claude-orange hover:bg-claude-orange-hover text-white
                rounded-lg py-2.5 font-medium mb-4 transition-colors flex items-center justify-center gap-2"
            >
              <span>+</span> New Chat
            </button>
            <div className="space-y-2">
              {conversations.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                    Conversations
                  </div>
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => setCurrentConversationId(conv.id)}
                      className={`group relative px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                        cursor-pointer text-sm ${
                          conv.id === currentConversationId ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                    >
                      {editingConversationId === conv.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleTitleKeyDown(e, conv.id)}
                          onBlur={() => saveConversationTitle(conv.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1 py-0.5 bg-white dark:bg-gray-900 border border-claude-orange
                            rounded focus:outline-none text-sm"
                        />
                      ) : (
                        <>
                          <div
                            onClick={(e) => startEditingConversation(conv, e)}
                            className="truncate pr-6"
                          >
                            {conv.title}
                          </div>
                          <button
                            onClick={(e) => deleteConversation(conv.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                              p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
                            title="Delete conversation"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col">
            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-8">
              <div className="max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-semibold mb-3">
                        Welcome to Claude
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        Start a conversation by typing a message below
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {[
                        '💡 Get started\nAsk me anything or try an example',
                        '🎨 Create something\nWrite code, design, or compose text'
                      ].map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestedPrompt(prompt.split('\n')[1])}
                          className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700
                            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="text-sm whitespace-pre-line">{prompt}</div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message, idx) => (
                      <div
                        key={message.id || idx}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : 'bg-transparent'
                          }`}
                        >
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {message.role === 'user' ? 'You' : 'Claude'}
                          </div>
                          <div className="prose dark:prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex justify-start">
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Streaming...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Claude..."
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300
                      dark:border-gray-700 bg-white dark:bg-gray-900
                      focus:outline-none focus:ring-2 focus:ring-claude-orange
                      resize-none"
                    rows="2"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      sendMessage()
                    }}
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-claude-orange
                      hover:bg-claude-orange-hover text-white transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Press Enter to send, Shift+Enter for new line
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
