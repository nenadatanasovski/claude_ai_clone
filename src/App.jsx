import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

const API_BASE = 'http://localhost:3001/api'

// Custom code block component with copy button
function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef(null)

  const handleCopy = async () => {
    const code = codeRef.current?.textContent || ''
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (inline) {
    return <code className={className} {...props}>{children}</code>
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600
          text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="!mb-0">
        <code ref={codeRef} className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

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
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { conversationId, x, y }
  const [showArchived, setShowArchived] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportConversationId, setExportConversationId] = useState(null)
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#CC785C')
  const [showMoveToProjectModal, setShowMoveToProjectModal] = useState(false)
  const [moveConversationId, setMoveConversationId] = useState(null)
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false)
  const [settingsProjectId, setSettingsProjectId] = useState(null)
  const [projectCustomInstructions, setProjectCustomInstructions] = useState('')
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const editInputRef = useRef(null)
  const streamReaderRef = useRef(null)
  const abortControllerRef = useRef(null)
  const modelDropdownRef = useRef(null)
  const contextMenuRef = useRef(null)
  const projectDropdownRef = useRef(null)

  // Model options
  const models = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4.5', description: 'Most capable model' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4.5', description: 'Fast and efficient' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4.1', description: 'Most intelligent' }
  ]

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false)
      }
    }

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isModelDropdownOpen])

  // Load conversations and projects on mount
  useEffect(() => {
    loadConversations()
    loadProjects()
  }, [])

  // Reload conversations when project changes
  useEffect(() => {
    loadConversations()
  }, [currentProjectId])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId)
    } else {
      setMessages([])
    }
  }, [currentConversationId])

  // Search conversations when search query changes
  useEffect(() => {
    loadConversations(searchQuery)
  }, [searchQuery])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to minHeight to get the correct scrollHeight
      textarea.style.height = '52px'
      // Calculate new height based on scrollHeight
      const newHeight = Math.max(52, Math.min(textarea.scrollHeight, 300)) // Min 52px, Max 300px
      textarea.style.height = `${newHeight}px`
    }
  }, [inputValue])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        closeContextMenu()
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  // Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false)
      }
    }

    if (isProjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isProjectDropdownOpen])

  const loadConversations = async (searchTerm = '') => {
    try {
      let url = `${API_BASE}/conversations`
      if (searchTerm && searchTerm.trim() !== '') {
        url = `${API_BASE}/search/conversations?q=${encodeURIComponent(searchTerm)}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      // Load conversation details to get the model
      const convResponse = await fetch(`${API_BASE}/conversations/${conversationId}`)
      const conversation = await convResponse.json()
      if (conversation.model) {
        setSelectedModel(conversation.model)
      }

      // Load messages
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`)
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/projects`)
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          color: newProjectColor
        })
      })
      const project = await response.json()
      setProjects([...projects, project])
      setCurrentProjectId(project.id)
      setShowProjectModal(false)
      setNewProjectName('')
      setNewProjectDescription('')
      setNewProjectColor('#CC785C')
    } catch (error) {
      console.error('Error creating project:', error)
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

  const stopGeneration = () => {
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel()
      streamReaderRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsLoading(false)
  }

  const updateConversationModel = async (conversationId, modelId) => {
    if (!conversationId) return

    try {
      await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      })
    } catch (error) {
      console.error('Error updating conversation model:', error)
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

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Send message to API
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText, role: 'user' }),
        signal: abortControllerRef.current.signal
      })

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        // Handle streaming response
        setIsStreaming(true)
        const reader = response.body.getReader()
        streamReaderRef.current = reader
        const decoder = new TextDecoder()
        let assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, assistantMessage])

        try {
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
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('Stream aborted by user')
          } else {
            console.error('Streaming error:', error)
          }
        } finally {
          setIsStreaming(false)
          streamReaderRef.current = null
          abortControllerRef.current = null
        }
      } else {
        // Handle regular JSON response
        const data = await response.json()
        // Reload all messages from the database to ensure consistency
        await loadMessages(conversationId)
      }

      // Reload conversations to update the list
      loadConversations()
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted by user')
      } else {
        console.error('Error sending message:', error)
        alert('Error sending message: ' + error.message)
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      streamReaderRef.current = null
      abortControllerRef.current = null
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

  const togglePinConversation = async (conversationId) => {
    try {
      const conversation = conversations.find(conv => conv.id === conversationId)
      if (!conversation) return

      const newPinnedState = !conversation.is_pinned

      const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: newPinnedState })
      })

      if (response.ok) {
        // Update local state
        setConversations(conversations.map(conv =>
          conv.id === conversationId ? { ...conv, is_pinned: newPinnedState } : conv
        ))
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const toggleArchiveConversation = async (conversationId) => {
    try {
      const conversation = conversations.find(conv => conv.id === conversationId)
      if (!conversation) return

      const newArchivedState = !conversation.is_archived

      const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: newArchivedState })
      })

      if (response.ok) {
        // Update local state
        setConversations(conversations.map(conv =>
          conv.id === conversationId ? { ...conv, is_archived: newArchivedState } : conv
        ))

        // If archiving the current conversation, clear it from view
        if (newArchivedState && currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error toggling archive:', error)
    }
  }

  const duplicateConversation = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const newConversation = await response.json()

        // Add the new conversation to the list
        setConversations([newConversation, ...conversations])

        // Optionally, switch to the new conversation
        setCurrentConversationId(newConversation.id)

        // Load messages for the new conversation
        const messagesResponse = await fetch(`${API_BASE}/conversations/${newConversation.id}/messages`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setMessages(messagesData)
        }
      }
    } catch (error) {
      console.error('Error duplicating conversation:', error)
    }
  }

  const openExportModal = (conversationId) => {
    setExportConversationId(conversationId)
    setShowExportModal(true)
    closeContextMenu()
  }

  const closeExportModal = () => {
    setShowExportModal(false)
    setExportConversationId(null)
  }

  const exportToJSON = async () => {
    try {
      const conversation = conversations.find(c => c.id === exportConversationId)
      if (!conversation) return

      // Fetch messages for this conversation
      const response = await fetch(`${API_BASE}/conversations/${exportConversationId}/messages`)
      if (!response.ok) return

      const messages = await response.json()

      // Create export data
      const exportData = {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          tokens: msg.tokens
        }))
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${conversation.title || 'conversation'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      closeExportModal()
    } catch (error) {
      console.error('Error exporting to JSON:', error)
    }
  }

  const exportToMarkdown = async () => {
    try {
      const conversation = conversations.find(c => c.id === exportConversationId)
      if (!conversation) return

      // Fetch messages for this conversation
      const response = await fetch(`${API_BASE}/conversations/${exportConversationId}/messages`)
      if (!response.ok) return

      const messages = await response.json()

      // Create markdown content
      let markdown = `# ${conversation.title || 'Conversation'}\n\n`
      markdown += `**Model:** ${conversation.model}\n`
      markdown += `**Created:** ${new Date(conversation.created_at).toLocaleString()}\n\n`
      markdown += `---\n\n`

      messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'You' : 'Claude'
        markdown += `### ${role}\n\n`
        markdown += `${msg.content}\n\n`
        if (index < messages.length - 1) {
          markdown += `---\n\n`
        }
      })

      // Download as markdown file
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${conversation.title || 'conversation'}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      closeExportModal()
    } catch (error) {
      console.error('Error exporting to Markdown:', error)
    }
  }

  const openMoveToProjectModal = (conversationId) => {
    setMoveConversationId(conversationId)
    setShowMoveToProjectModal(true)
    closeContextMenu()
  }

  const closeMoveToProjectModal = () => {
    setShowMoveToProjectModal(false)
    setMoveConversationId(null)
  }

  const moveConversationToProject = async (projectId) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${moveConversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      })

      if (response.ok) {
        // Update local state
        setConversations(conversations.map(conv =>
          conv.id === moveConversationId ? { ...conv, project_id: projectId } : conv
        ))
        closeMoveToProjectModal()
      }
    } catch (error) {
      console.error('Error moving conversation to project:', error)
    }
  }

  const openProjectSettings = async (projectId) => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}`)
      const project = await response.json()
      setSettingsProjectId(projectId)
      setProjectCustomInstructions(project.custom_instructions || '')
      setShowProjectSettingsModal(true)
      setIsProjectDropdownOpen(false)
    } catch (error) {
      console.error('Error loading project settings:', error)
    }
  }

  const closeProjectSettings = () => {
    setShowProjectSettingsModal(false)
    setSettingsProjectId(null)
    setProjectCustomInstructions('')
  }

  const saveProjectSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/projects/${settingsProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: projectCustomInstructions })
      })

      if (response.ok) {
        // Reload projects to get updated data
        loadProjects()
        closeProjectSettings()
      }
    } catch (error) {
      console.error('Error saving project settings:', error)
    }
  }

  const handleContextMenu = (e, conversationId) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      conversationId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Claude</h1>

            <div className="flex items-center gap-3">
              {/* Project Selector */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <span className="text-sm font-medium">
                    {currentProjectId ? (projects.find(p => p.id === currentProjectId)?.name || 'All Conversations') : 'All Conversations'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Project Dropdown Menu */}
                {isProjectDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentProjectId(null)
                        setIsProjectDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                        transition-colors first:rounded-t-lg ${
                        currentProjectId === null ? 'bg-gray-50 dark:bg-gray-700' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">All Conversations</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        View all your conversations
                      </div>
                    </button>
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`group relative hover:bg-gray-50 dark:hover:bg-gray-700
                          transition-colors ${
                          currentProjectId === project.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentProjectId(project.id)
                            setIsProjectDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || '#CC785C' }}></div>
                            <div className="font-medium text-sm">{project.name}</div>
                          </div>
                          {project.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                              {project.description}
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openProjectSettings(project.id)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                            p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                          title="Project Settings"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600 dark:text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProjectModal(true)
                          setIsProjectDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                          transition-colors last:rounded-b-lg text-claude-orange font-medium text-sm"
                      >
                        + New Project
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Model Selector */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <span className="text-sm font-medium">
                    {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id)
                          setIsModelDropdownOpen(false)
                          updateConversationModel(currentConversationId, model.id)
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                          transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedModel === model.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {model.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDark(!isDark)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isDark ? '☀️' : '🌙'}Dark
              </button>
            </div>
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

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-claude-orange text-sm
                  placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* View Toggle */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !showArchived
                    ? 'bg-claude-orange text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showArchived
                    ? 'bg-claude-orange text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Archived
              </button>
            </div>

            <div className="space-y-2">
              {conversations.filter(c => (showArchived ? c.is_archived : !c.is_archived) && (currentProjectId === null || c.project_id === currentProjectId)).length > 0 && (
                <>
                  {/* Pinned Conversations */}
                  {conversations.filter(c => (showArchived ? c.is_archived : !c.is_archived) && c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId)).length > 0 && (
                    <>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                        Pinned
                      </div>
                      {conversations.filter(c => (showArchived ? c.is_archived : !c.is_archived) && c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId)).map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => setCurrentConversationId(conv.id)}
                          onContextMenu={(e) => handleContextMenu(e, conv.id)}
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
                                📌 {conv.title}
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

                  {/* Regular Conversations */}
                  {conversations.filter(c => (showArchived ? c.is_archived : !c.is_archived) && !c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId)).length > 0 && (
                    <>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                        Conversations
                      </div>
                      {conversations.filter(c => (showArchived ? c.is_archived : !c.is_archived) && !c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId)).map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => setCurrentConversationId(conv.id)}
                          onContextMenu={(e) => handleContextMenu(e, conv.id)}
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
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code: CodeBlock
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
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
                      resize-none overflow-hidden"
                    style={{ minHeight: '52px' }}
                    disabled={isLoading}
                  />
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        stopGeneration()
                      }}
                      className="absolute right-2 bottom-2 px-3 py-2 rounded-lg bg-red-500
                        hover:bg-red-600 text-white transition-colors font-medium text-sm"
                    >
                      Stop
                    </button>
                  ) : (
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
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span className="font-medium">{inputValue.length} characters</span>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            style={{
              position: 'fixed',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              zIndex: 1000
            }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg py-1 min-w-[160px]"
          >
            <button
              onClick={() => {
                togglePinConversation(contextMenu.conversationId)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              {conversations.find(c => c.id === contextMenu.conversationId)?.is_pinned ? (
                <>
                  <span>📌</span>
                  <span>Unpin</span>
                </>
              ) : (
                <>
                  <span>📌</span>
                  <span>Pin</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                toggleArchiveConversation(contextMenu.conversationId)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              {conversations.find(c => c.id === contextMenu.conversationId)?.is_archived ? (
                <>
                  <span>📤</span>
                  <span>Unarchive</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>Archive</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                duplicateConversation(contextMenu.conversationId)
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>📋</span>
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => {
                openMoveToProjectModal(contextMenu.conversationId)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>📁</span>
              <span>Move to Project</span>
            </button>
            <button
              onClick={() => {
                openExportModal(contextMenu.conversationId)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>📥</span>
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                const conv = conversations.find(c => c.id === contextMenu.conversationId)
                if (conv) {
                  startEditingConversation(conv, { stopPropagation: () => {} })
                }
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>✏️</span>
              <span>Rename</span>
            </button>
            <button
              onClick={() => {
                deleteConversation(contextMenu.conversationId, { stopPropagation: () => {} })
                closeContextMenu()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Export Conversation</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose a format to export your conversation:
              </p>
              <div className="space-y-3">
                <button
                  onClick={exportToJSON}
                  className="w-full px-4 py-3 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span>
                    <span>Export as JSON</span>
                  </span>
                  <span className="text-sm opacity-75">.json</span>
                </button>
                <button
                  onClick={exportToMarkdown}
                  className="w-full px-4 py-3 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span>📝</span>
                    <span>Export as Markdown</span>
                  </span>
                  <span className="text-sm opacity-75">.md</span>
                </button>
              </div>
              <button
                onClick={closeExportModal}
                className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600
                  rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Move to Project Modal */}
        {showMoveToProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Move to Project</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select a project to move this conversation to:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <button
                  onClick={() => moveConversationToProject(null)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="font-medium">All Conversations</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Remove from project</div>
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => moveConversationToProject(project.id)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600
                      rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="font-medium">{project.name}</div>
                    </div>
                    {project.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {project.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={closeMoveToProjectModal}
                className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600
                  rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Project Settings Modal */}
        {showProjectSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Custom Instructions
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    These instructions will be applied to all conversations in this project.
                  </p>
                  <textarea
                    value={projectCustomInstructions}
                    onChange={(e) => setProjectCustomInstructions(e.target.value)}
                    placeholder="e.g., Always respond in Spanish"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                      rounded-lg bg-white dark:bg-gray-900 resize-none"
                    rows={6}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeProjectSettings}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProjectSettings}
                  className="flex-1 px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:outline-none focus:ring-2 focus:ring-claude-orange"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:outline-none focus:ring-2 focus:ring-claude-orange resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {['#CC785C', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProjectColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newProjectColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowProjectModal(false)
                    setNewProjectName('')
                    setNewProjectDescription('')
                    setNewProjectColor('#CC785C')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  className="flex-1 px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
