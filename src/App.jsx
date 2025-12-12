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

// Shared Conversation View Component
function SharedConversationView({ token }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [artifacts, setArtifacts] = useState([])

  useEffect(() => {
    fetchSharedConversation()
  }, [token])

  const fetchSharedConversation = async () => {
    try {
      const response = await fetch(`${API_BASE}/share/${token}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('This shared conversation does not exist.')
        } else if (response.status === 410) {
          setError('This share link has expired.')
        } else {
          setError('Failed to load shared conversation.')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setConversation(data.conversation)
      setMessages(data.messages || [])
      setArtifacts(data.artifacts || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching shared conversation:', err)
      setError('Failed to load shared conversation.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-claude-orange mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared conversation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Oops!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-claude-orange hover:bg-claude-orange-hover
              text-white rounded-lg transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Claude</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Shared Conversation (Read-only)</span>
            <a
              href="/"
              className="px-4 py-2 text-sm bg-claude-orange hover:bg-claude-orange-hover
                text-white rounded-lg transition-colors"
            >
              Try Claude
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {conversation && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{conversation.title || 'Untitled Conversation'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date(conversation.created_at).toLocaleDateString()}
            </p>
          </div>
        )}

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
        </div>
      </main>
    </div>
  )
}

function App() {
  // Check if we're on a share route
  const path = window.location.pathname
  const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/)

  if (shareMatch) {
    return <SharedConversationView token={shareMatch[1]} />
  }

  const [isDark, setIsDark] = useState(false)
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { conversationId, x, y }
  const [showArchived, setShowArchived] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportConversationId, setExportConversationId] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareConversationId, setShareConversationId] = useState(null)
  const [shareLink, setShareLink] = useState(null)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
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
  const [folders, setFolders] = useState([])
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenuType, setContextMenuType] = useState('conversation') // 'conversation' or 'sidebar'
  const [draggedConversationId, setDraggedConversationId] = useState(null)
  const [folderConversations, setFolderConversations] = useState({}) // Map of folder ID to conversation IDs
  const [artifacts, setArtifacts] = useState([])
  const [currentArtifact, setCurrentArtifact] = useState(null)
  const [showArtifactPanel, setShowArtifactPanel] = useState(false)
  const [isArtifactFullscreen, setIsArtifactFullscreen] = useState(false)
  const [isEditingArtifact, setIsEditingArtifact] = useState(false)
  const [editedArtifactContent, setEditedArtifactContent] = useState('')
  const [showRepromptModal, setShowRepromptModal] = useState(false)
  const [repromptInstruction, setRepromptInstruction] = useState('')
  const [artifactVersions, setArtifactVersions] = useState([])
  const [showVersionSelector, setShowVersionSelector] = useState(false)
  const [messageArtifacts, setMessageArtifacts] = useState({}) // Map of message ID to artifacts array
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editedMessageContent, setEditedMessageContent] = useState('')
  const [branches, setBranches] = useState([]) // Conversation branches
  const [currentBranch, setCurrentBranch] = useState(null) // Currently selected branch path
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [theme, setTheme] = useState('light') // 'light', 'dark', or 'auto'
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize')
    return saved ? Number(saved) : 16
  }) // Font size in pixels (12-24)
  const [messageDensity, setMessageDensity] = useState(() => {
    const saved = localStorage.getItem('messageDensity')
    return saved || 'comfortable'
  }) // 'compact', 'comfortable', or 'spacious'
  const [globalCustomInstructions, setGlobalCustomInstructions] = useState('')
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('temperature')
    return saved ? Number(saved) : 1.0
  }) // Temperature (0.0-1.0)
  const [maxTokens, setMaxTokens] = useState(() => {
    const saved = localStorage.getItem('maxTokens')
    return saved ? Number(saved) : 4096
  }) // Max tokens (100-4096)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const editInputRef = useRef(null)
  const editMessageRef = useRef(null)
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
    loadFolders()
    loadCustomInstructions()
  }, [])

  // Handle theme changes
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
      } else {
        setIsDark(theme === 'dark')
      }
    }

    applyTheme()

    // Listen for system theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Save font size setting to localStorage
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString())
  }, [fontSize])

  // Save message density setting to localStorage
  useEffect(() => {
    localStorage.setItem('messageDensity', messageDensity)
  }, [messageDensity])

  // Save temperature setting to localStorage
  useEffect(() => {
    localStorage.setItem('temperature', temperature.toString())
  }, [temperature])

  // Save maxTokens setting to localStorage
  useEffect(() => {
    localStorage.setItem('maxTokens', maxTokens.toString())
  }, [maxTokens])

  // Reload conversations when project changes
  useEffect(() => {
    loadConversations()
    loadFolders()
  }, [currentProjectId])

  // Load folder conversations when folders change
  useEffect(() => {
    if (folders.length > 0) {
      loadFolderConversations(folders)
    }
  }, [folders])

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

  // Fetch artifact versions when current artifact changes
  useEffect(() => {
    if (currentArtifact && currentArtifact.id) {
      fetchArtifactVersions(currentArtifact.id)
    } else {
      setArtifactVersions([])
    }
  }, [currentArtifact])

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
      // Load conversation details to get the model and settings
      const convResponse = await fetch(`${API_BASE}/conversations/${conversationId}`)
      const conversation = await convResponse.json()
      if (conversation.model) {
        setSelectedModel(conversation.model)
      }

      // Load max_tokens from conversation settings
      if (conversation.settings) {
        try {
          const settings = JSON.parse(conversation.settings)
          if (settings.max_tokens !== undefined) {
            setMaxTokens(settings.max_tokens)
          }
        } catch (error) {
          console.error('Error parsing conversation settings:', error)
        }
      }

      // Load messages
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`)
      const data = await response.json()
      setMessages(data)

      // Load artifacts for this conversation
      const artifactsResponse = await fetch(`${API_BASE}/conversations/${conversationId}/artifacts`)
      const artifactsData = await artifactsResponse.json()
      setArtifacts(artifactsData)

      // Load artifacts for each message
      const msgArtifacts = {}
      for (const message of data) {
        if (message.id) {
          try {
            const msgArtResponse = await fetch(`${API_BASE}/messages/${message.id}/artifacts`)
            const msgArtData = await msgArtResponse.json()
            if (msgArtData.length > 0) {
              msgArtifacts[message.id] = msgArtData
            }
          } catch (err) {
            console.error(`Error loading artifacts for message ${message.id}:`, err)
          }
        }
      }
      setMessageArtifacts(msgArtifacts)

      // If there are artifacts, show the panel and select the first one
      if (artifactsData.length > 0) {
        setCurrentArtifact(artifactsData[0])
        setShowArtifactPanel(true)
      } else {
        setShowArtifactPanel(false)
        setCurrentArtifact(null)
      }

      // Load branches for this conversation
      loadBranches(conversationId)
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

  const loadFolders = async () => {
    try {
      let url = `${API_BASE}/folders`
      if (currentProjectId) {
        url += `?project_id=${currentProjectId}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setFolders(data)
    } catch (error) {
      console.error('Error loading folders:', error)
    }
  }

  const loadCustomInstructions = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/custom-instructions`)
      const data = await response.json()
      setGlobalCustomInstructions(data.custom_instructions || '')
    } catch (error) {
      console.error('Error loading custom instructions:', error)
    }
  }

  const saveCustomInstructions = async () => {
    try {
      await fetch(`${API_BASE}/settings/custom-instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: globalCustomInstructions })
      })
    } catch (error) {
      console.error('Error saving custom instructions:', error)
    }
  }

  const openArtifactsFromMessage = (messageId) => {
    const msgArtifacts = messageArtifacts[messageId]
    if (msgArtifacts && msgArtifacts.length > 0) {
      setArtifacts(msgArtifacts)
      setCurrentArtifact(msgArtifacts[0])
      setShowArtifactPanel(true)
      setIsArtifactFullscreen(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const response = await fetch(`${API_BASE}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          project_id: currentProjectId,
          parent_folder_id: null
        })
      })
      const data = await response.json()
      setFolders([...folders, data])
      setNewFolderName('')
      setShowFolderModal(false)
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  const handleReprompt = async () => {
    if (!repromptInstruction.trim() || !currentArtifact) return

    // Close the modal
    setShowRepromptModal(false)

    // Create a contextual message that references the artifact
    const contextualMessage = `Please modify the following ${currentArtifact.type} artifact: "${currentArtifact.title || 'artifact'}"\n\nCurrent content:\n\`\`\`${currentArtifact.language || ''}\n${currentArtifact.content}\n\`\`\`\n\nModification request: ${repromptInstruction.trim()}`

    // Set the input value and trigger send
    setInputValue(contextualMessage)
    setRepromptInstruction('')

    // Wait a brief moment for state to update, then send
    setTimeout(() => {
      // Manually trigger the send by calling sendMessage
      // We need to use the contextual message directly since state may not have updated yet
      const sendRepromptMessage = async () => {
        if (isLoading) return

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
            content: contextualMessage,
            created_at: new Date().toISOString()
          }
          setMessages(prev => [...prev, userMessage])

          // Create abort controller for this request
          abortControllerRef.current = new AbortController()

          // Send message to API
          const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: contextualMessage, role: 'user' }),
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
                const { value, done } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                      break
                    }
                    try {
                      const parsed = JSON.parse(data)
                      if (parsed.content) {
                        assistantMessage.content += parsed.content
                        setMessages(prev => {
                          const newMessages = [...prev]
                          newMessages[newMessages.length - 1] = { ...assistantMessage }
                          return newMessages
                        })
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              }
            } catch (error) {
              if (error.name !== 'AbortError') {
                console.error('Streaming error:', error)
              }
            } finally {
              setIsStreaming(false)
              streamReaderRef.current = null

              // Load artifacts after streaming completes
              try {
                const artifactsResponse = await fetch(`${API_BASE}/conversations/${conversationId}/artifacts`)
                if (artifactsResponse.ok) {
                  const artifactsData = await artifactsResponse.json()
                  if (artifactsData.length > 0) {
                    setArtifacts(artifactsData)
                    setCurrentArtifact(artifactsData[artifactsData.length - 1]) // Show latest artifact
                    setShowArtifactPanel(true)
                  }
                }
              } catch (error) {
                console.error('Error loading artifacts:', error)
              }
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error sending message:', error)
            alert('Failed to send message. Please try again.')
          }
        } finally {
          setIsLoading(false)
          abortControllerRef.current = null
        }
      }

      sendRepromptMessage()
    }, 50)
  }

  // Fetch artifact versions
  const fetchArtifactVersions = async (artifactId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/artifacts/${artifactId}/versions`)
      if (response.ok) {
        const versions = await response.json()
        setArtifactVersions(versions)
      } else {
        console.error('Failed to fetch artifact versions')
        setArtifactVersions([])
      }
    } catch (error) {
      console.error('Error fetching artifact versions:', error)
      setArtifactVersions([])
    }
  }

  // Switch to a different artifact version
  const switchToVersion = (versionArtifact) => {
    setCurrentArtifact(versionArtifact)
    setShowVersionSelector(false)
  }

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const deleteFolder = async (folderId) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this folder? Conversations inside will be moved back to the main list.')

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/folders/${folderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setFolders(folders.filter(f => f.id !== folderId))

        // Remove folder from expanded set
        const newExpanded = new Set(expandedFolders)
        newExpanded.delete(folderId)
        setExpandedFolders(newExpanded)

        // Clear folder conversations mapping
        const newFolderConvs = { ...folderConversations }
        delete newFolderConvs[folderId]
        setFolderConversations(newFolderConvs)

        // Reload conversations to show the ones that were in the folder
        loadConversations()
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder. Please try again.')
    }
  }

  const handleDragStart = (e, conversationId) => {
    setDraggedConversationId(conversationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnFolder = async (e, folderId) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedConversationId) return

    try {
      const response = await fetch(`${API_BASE}/folders/${folderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: draggedConversationId })
      })

      if (response.ok) {
        // Update folder conversations mapping
        setFolderConversations(prev => ({
          ...prev,
          [folderId]: [...(prev[folderId] || []), draggedConversationId]
        }))

        // Expand the folder to show the new conversation
        const newExpanded = new Set(expandedFolders)
        newExpanded.add(folderId)
        setExpandedFolders(newExpanded)
      }
    } catch (error) {
      console.error('Error adding conversation to folder:', error)
    }

    setDraggedConversationId(null)
  }

  const loadFolderConversations = async (foldersToLoad = folders) => {
    try {
      // For each folder, get its conversations
      const folderConvsMap = {}
      for (const folder of foldersToLoad) {
        const response = await fetch(`${API_BASE}/folders/${folder.id}/items`)
        const items = await response.json()
        folderConvsMap[folder.id] = items.map(item => item.conversation_id)
      }
      setFolderConversations(folderConvsMap)
    } catch (error) {
      console.error('Error loading folder conversations:', error)
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

  const updateConversationSettings = async (conversationId, settings) => {
    if (!conversationId) return

    try {
      await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
    } catch (error) {
      console.error('Error updating conversation settings:', error)
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
        images: selectedImages.length > 0 ? selectedImages : null,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Prepare message payload with images
      const messagePayload = {
        content: messageText,
        role: 'user',
        temperature: temperature,
        maxTokens: maxTokens
      }

      if (selectedImages.length > 0) {
        messagePayload.images = selectedImages.map(img => ({
          type: img.type,
          data: img.data
        }))
      }

      // Send message to API
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
        signal: abortControllerRef.current.signal
      })

      // Clear selected images after sending
      setSelectedImages([])

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

          // Load artifacts after streaming completes
          try {
            const artifactsResponse = await fetch(`${API_BASE}/conversations/${conversationId}/artifacts`)
            const artifactsData = await artifactsResponse.json()
            setArtifacts(artifactsData)

            // Also load artifacts for the assistant message
            if (assistantMessage.id) {
              try {
                const msgArtResponse = await fetch(`${API_BASE}/messages/${assistantMessage.id}/artifacts`)
                const msgArtData = await msgArtResponse.json()
                if (msgArtData.length > 0) {
                  setMessageArtifacts(prev => ({
                    ...prev,
                    [assistantMessage.id]: msgArtData
                  }))
                }
              } catch (err) {
                console.error('Error loading message artifacts:', err)
              }
            }

            // If there are artifacts, show the panel and select the first one
            if (artifactsData.length > 0) {
              setCurrentArtifact(artifactsData[0])
              setShowArtifactPanel(true)
            }
          } catch (error) {
            console.error('Error loading artifacts:', error)
          }
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

  const regenerateMessage = async (messageId) => {
    if (isLoading || !currentConversationId) {
      return
    }

    try {
      // Find the assistant message and the user message before it
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1 || messageIndex === 0) {
        return
      }

      // Find the user message that prompted this assistant response
      const userMessageIndex = messageIndex - 1
      if (messages[userMessageIndex].role !== 'user') {
        return
      }

      const userMessage = messages[userMessageIndex]

      // Remove the old assistant message from UI
      setMessages(prev => prev.filter(m => m.id !== messageId))

      setIsLoading(true)

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Prepare message payload (resend the user message)
      const messagePayload = {
        content: userMessage.content,
        role: 'user',
        regenerate: true  // Flag to indicate this is a regeneration
      }

      if (userMessage.images) {
        messagePayload.images = userMessage.images.map(img => ({
          type: img.type,
          data: img.data || img.preview
        }))
      }

      // Send message to API for regeneration
      const response = await fetch(`${API_BASE}/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
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

          // Load artifacts after response complete
          if (assistantMessage.id) {
            const artifactsResponse = await fetch(`${API_BASE}/messages/${assistantMessage.id}/artifacts`)
            const artifacts = await artifactsResponse.json()
            if (artifacts.length > 0) {
              setMessageArtifacts(prev => ({
                ...prev,
                [assistantMessage.id]: artifacts
              }))
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error reading stream:', error)
          }
        } finally {
          setIsStreaming(false)
          streamReaderRef.current = null
        }
      } else {
        // Handle regular JSON response
        const data = await response.json()
        await loadMessages(currentConversationId)
      }

      // Reload conversations to update the list
      loadConversations()
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Regeneration aborted by user')
      } else {
        console.error('Error regenerating message:', error)
        alert('Error regenerating message: ' + error.message)
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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    // Convert images to base64 for preview and sending
    const promises = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            file,
            name: file.name,
            type: file.type,
            data: reader.result, // base64 data URL
            preview: reader.result
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(promises).then(images => {
      setSelectedImages(prev => [...prev, ...images])
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const startEditingMessage = (message) => {
    setEditingMessageId(message.id)
    setEditedMessageContent(message.content)
  }

  const cancelEditingMessage = () => {
    setEditingMessageId(null)
    setEditedMessageContent('')
  }

  const saveEditedMessage = async (messageId) => {
    if (!editedMessageContent.trim()) {
      return
    }

    try {
      // Find the message in the messages array
      const messageIndex = messages.findIndex(m => m.id === messageId)
      const hasMessagesAfter = messageIndex < messages.length - 1

      // Update the message in the backend with branching flag
      const response = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedMessageContent,
          createBranch: hasMessagesAfter // Create a branch if there are messages after this one
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update message')
      }

      const data = await response.json()

      // Exit edit mode
      setEditingMessageId(null)
      setEditedMessageContent('')

      if (data.branched) {
        // If branching occurred, we need to:
        // 1. Remove all messages after the edited one
        // 2. Add the new branch message
        // 3. Trigger a new AI response
        const messagesBeforeEdit = messages.slice(0, messageIndex)
        setMessages([...messagesBeforeEdit, data.message])

        // If it was a user message, trigger a new AI response
        if (data.message.role === 'user') {
          // Send the edited message to get a new response
          await sendMessageWithContent(data.message.content, data.message.id)
        }

        // Load branches for this conversation
        loadBranches(currentConversationId)
      } else {
        // Normal update without branching
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: editedMessageContent }
            : msg
        ))

        // Reload the conversation to ensure consistency
        if (currentConversationId) {
          loadMessages(currentConversationId)
        }
      }
    } catch (error) {
      console.error('Error updating message:', error)
      alert('Failed to update message')
    }
  }

  // Load branches for a conversation
  const loadBranches = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/branches`)
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches)
      }
    } catch (error) {
      console.error('Error loading branches:', error)
    }
  }

  // Helper function to send a message from an edited message
  const sendMessageWithContent = async (content, parentMessageId) => {
    if (!currentConversationId) return

    setIsLoading(true)
    setIsStreaming(true)

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const response = await fetch(`${API_BASE}/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'user',
          content: content,
          model: selectedModel,
          parentMessageId: parentMessageId,
          temperature: temperature,
          maxTokens: maxTokens
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''
      let currentMessageId = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'message_start') {
                currentMessageId = data.messageId
                setMessages(prev => [...prev, {
                  id: currentMessageId,
                  role: 'assistant',
                  content: '',
                  conversation_id: currentConversationId,
                  created_at: new Date().toISOString()
                }])
              } else if (data.type === 'content_block_delta' && data.delta?.text) {
                accumulatedText += data.delta.text
                setMessages(prev => prev.map(msg =>
                  msg.id === currentMessageId
                    ? { ...msg, content: accumulatedText }
                    : msg
                ))
              } else if (data.type === 'message_stop') {
                // Load artifacts if any
                if (currentMessageId) {
                  loadMessageArtifacts(currentMessageId)
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      loadConversations()
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Error sending message:', error)
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
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

  const openShareModal = async (conversationId) => {
    setShareConversationId(conversationId)
    setShowShareModal(true)
    setShareLink(null)
    setShareLinkCopied(false)
    closeContextMenu()

    // Generate share link
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        const fullUrl = `${window.location.origin}/share/${data.share_token}`
        setShareLink(fullUrl)
      }
    } catch (error) {
      console.error('Error creating share link:', error)
    }
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setShareConversationId(null)
    setShareLink(null)
    setShareLinkCopied(false)
  }

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    }
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
    setContextMenuType('conversation')
    setContextMenu({
      conversationId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleSidebarContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuType('sidebar')
    setContextMenu({
      conversationId: null,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleFolderContextMenu = (e, folderId) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuType('folder')
    setContextMenu({
      folderId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
    setContextMenuType('conversation')
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
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">Settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-60px)]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4" onContextMenu={handleSidebarContextMenu}>
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
                      {conversations.filter(c => {
                        // Filter out conversations that are in folders
                        const isInFolder = Object.values(folderConversations).some(convIds => convIds.includes(c.id))
                        return (showArchived ? c.is_archived : !c.is_archived) && c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId) && !isInFolder
                      }).map(conv => (
                        <div
                          key={conv.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, conv.id)}
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
                      {conversations.filter(c => {
                        // Filter out conversations that are in folders
                        const isInFolder = Object.values(folderConversations).some(convIds => convIds.includes(c.id))
                        return (showArchived ? c.is_archived : !c.is_archived) && !c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId) && !isInFolder
                      }).map(conv => (
                        <div
                          key={conv.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, conv.id)}
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

              {/* Folders Section */}
              {folders.filter(f => currentProjectId === null || f.project_id === currentProjectId).length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mt-4">
                    Folders
                  </div>
                  {folders.filter(f => currentProjectId === null || f.project_id === currentProjectId).map(folder => {
                    const folderConvs = (folderConversations[folder.id] || [])
                      .map(convId => conversations.find(c => c.id === convId))
                      .filter(c => c) // Filter out undefined

                    return (
                    <div key={folder.id} className="mb-1">
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        className="px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                          cursor-pointer text-sm flex items-center gap-2"
                      >
                        <span>{expandedFolders.has(folder.id) ? '📂' : '📁'}</span>
                        <span className="truncate">{folder.name}</span>
                      </div>
                      {expandedFolders.has(folder.id) && (
                        <div className="ml-6">
                          {folderConvs.length === 0 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                              Empty folder
                            </div>
                          ) : (
                            folderConvs.map(conv => (
                              <div
                                key={conv.id}
                                onClick={() => setCurrentConversationId(conv.id)}
                                className={`px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                                  cursor-pointer text-sm ${
                                    conv.id === currentConversationId ? 'bg-gray-100 dark:bg-gray-800' : ''
                                  }`}
                              >
                                <div className="truncate">{conv.title}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )})}
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
                  <div className={`${messageDensity === 'compact' ? 'space-y-3' : messageDensity === 'spacious' ? 'space-y-8' : 'space-y-6'}`}>
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
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {message.role === 'user' ? 'You' : 'Claude'}
                            </div>
                            {/* Branch indicator */}
                            {(() => {
                              const messageBranch = branches.find(b =>
                                b.branches.some(branch => branch.messageId === message.id) ||
                                (b.parentId && idx > 0 && messages[idx - 1]?.id === b.parentId)
                              )
                              if (messageBranch && messageBranch.branches.length > 1) {
                                const currentBranchIndex = messageBranch.branches.findIndex(b => b.messageId === message.id)
                                return (
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Branch {currentBranchIndex + 1}/{messageBranch.branches.length}
                                    </span>
                                    <div className="flex gap-0.5">
                                      {messageBranch.branches.map((branch, branchIdx) => (
                                        <button
                                          key={branch.messageId}
                                          onClick={async () => {
                                            // Switch to this branch by reloading messages up to this point
                                            // and then following this branch
                                            const messagesBeforeBranch = messages.slice(0, idx)
                                            const branchMessage = await fetch(`${API_BASE}/conversations/${currentConversationId}/messages`).then(r => r.json())
                                            const targetMessage = branchMessage.find(m => m.id === branch.messageId)
                                            if (targetMessage) {
                                              // Reload conversation to show this branch
                                              loadMessages(currentConversationId)
                                            }
                                          }}
                                          className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                                            branchIdx === currentBranchIndex
                                              ? 'bg-[#CC785C] text-white'
                                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                          }`}
                                          title={`Switch to branch ${branchIdx + 1}: ${branch.content.substring(0, 50)}...`}
                                        >
                                          {branchIdx + 1}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                          {/* Display images if present */}
                          {message.images && message.images.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {message.images.map((img, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={img.preview || img.data}
                                  alt={img.name || `Image ${imgIdx + 1}`}
                                  className="max-w-xs max-h-48 rounded-lg border border-gray-300 dark:border-gray-700"
                                />
                              ))}
                            </div>
                          )}
                          {/* Message content - editable for user messages */}
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <textarea
                                ref={editMessageRef}
                                value={editedMessageContent}
                                onChange={(e) => setEditedMessageContent(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300
                                  dark:border-gray-700 bg-white dark:bg-gray-900
                                  text-gray-900 dark:text-gray-100
                                  focus:outline-none focus:ring-2 focus:ring-claude-orange
                                  resize-none"
                                style={{ minHeight: '80px' }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditedMessage(message.id)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md
                                    bg-[#CC785C] text-white hover:bg-[#B86A4F]
                                    transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditingMessage}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md
                                    border border-gray-300 dark:border-gray-600
                                    text-gray-700 dark:text-gray-300
                                    hover:bg-gray-100 dark:hover:bg-gray-800
                                    transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="prose dark:prose-invert prose-sm max-w-none" style={{ fontSize: `${fontSize}px` }}>
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
                          )}
                          {messageArtifacts[message.id] && messageArtifacts[message.id].length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => openArtifactsFromMessage(message.id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium
                                  rounded-md bg-[#CC785C] text-white hover:bg-[#B86A4F]
                                  transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                View {messageArtifacts[message.id].length} Artifact{messageArtifacts[message.id].length > 1 ? 's' : ''}
                              </button>
                            </div>
                          )}
                          {/* Regenerate button for assistant messages */}
                          {message.role === 'assistant' && idx === messages.length - 1 && !isStreaming && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => regenerateMessage(message.id)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                                  rounded-md border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-100 dark:hover:bg-gray-800
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors"
                                title="Regenerate response"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                              </button>
                            </div>
                          )}
                          {/* Edit button for user messages */}
                          {message.role === 'user' && !isStreaming && editingMessageId !== message.id && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => startEditingMessage(message)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                                  rounded-md border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-100 dark:hover:bg-gray-800
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors"
                                title="Edit message"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            </div>
                          )}
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
                {/* Image Previews */}
                {selectedImages.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600
                            text-white rounded-full flex items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Claude..."
                    className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300
                      dark:border-gray-700 bg-white dark:bg-gray-900
                      focus:outline-none focus:ring-2 focus:ring-claude-orange
                      resize-none overflow-hidden"
                    style={{ minHeight: '52px' }}
                    disabled={isLoading}
                  />
                  {/* Image attachment button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isStreaming}
                    className="absolute left-2 bottom-2 p-2 rounded-lg hover:bg-gray-100
                      dark:hover:bg-gray-800 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach image"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

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

          {/* Artifact Panel */}
          {showArtifactPanel && currentArtifact && (
            <aside className={`border-l border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-[#1A1A1A] ${
              isArtifactFullscreen ? 'fixed inset-0 z-50 w-full' : 'w-96'
            }`}>
              {/* Artifact Header */}
              <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Artifact
                  </div>
                  {artifacts.length > 1 && (
                    <div className="text-xs text-gray-400">
                      {artifacts.indexOf(currentArtifact) + 1} / {artifacts.length}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingArtifact && currentArtifact.type === 'code' && (
                    <button
                      onClick={() => {
                        setIsEditingArtifact(true);
                        setEditedArtifactContent(currentArtifact.content);
                      }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Edit artifact"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {!isEditingArtifact && (
                    <button
                      onClick={() => {
                        setShowRepromptModal(true);
                        setRepromptInstruction('');
                      }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Re-prompt artifact"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Create download function
                      const downloadArtifact = () => {
                        const blob = new Blob([currentArtifact.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;

                        // Generate filename based on artifact type and language
                        let extension = '.txt';
                        if (currentArtifact.type === 'html') {
                          extension = '.html';
                        } else if (currentArtifact.type === 'svg') {
                          extension = '.svg';
                        } else if (currentArtifact.language === 'python') {
                          extension = '.py';
                        } else if (currentArtifact.language === 'javascript') {
                          extension = '.js';
                        } else if (currentArtifact.language === 'typescript') {
                          extension = '.ts';
                        } else if (currentArtifact.language === 'java') {
                          extension = '.java';
                        } else if (currentArtifact.language === 'cpp' || currentArtifact.language === 'c++') {
                          extension = '.cpp';
                        } else if (currentArtifact.language === 'c') {
                          extension = '.c';
                        } else if (currentArtifact.language === 'ruby') {
                          extension = '.rb';
                        } else if (currentArtifact.language === 'go') {
                          extension = '.go';
                        } else if (currentArtifact.language === 'rust') {
                          extension = '.rs';
                        } else if (currentArtifact.language === 'php') {
                          extension = '.php';
                        } else if (currentArtifact.language === 'css') {
                          extension = '.css';
                        } else if (currentArtifact.language === 'json') {
                          extension = '.json';
                        } else if (currentArtifact.language === 'yaml' || currentArtifact.language === 'yml') {
                          extension = '.yml';
                        } else if (currentArtifact.language) {
                          extension = '.' + currentArtifact.language;
                        }

                        // Create filename from title or use default
                        const filename = (currentArtifact.title || 'artifact').replace(/\s+/g, '_') + extension;
                        a.download = filename;

                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      };

                      downloadArtifact();
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Download artifact"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsArtifactFullscreen(!isArtifactFullscreen)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={isArtifactFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isArtifactFullscreen ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowArtifactPanel(false)
                      setIsArtifactFullscreen(false)
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Close artifact panel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Artifact Tabs - Show when multiple artifacts exist */}
              {artifacts.length > 1 && (
                <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
                  <div className="flex">
                    {artifacts.map((artifact, index) => (
                      <button
                        key={artifact.id}
                        onClick={() => setCurrentArtifact(artifact)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
                          border-b-2 ${
                          artifact.id === currentArtifact.id
                            ? 'border-[#CC785C] text-[#CC785C] bg-gray-50 dark:bg-gray-800'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {artifact.title || `Artifact ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifact Title */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{currentArtifact.title}</div>
                  {artifactVersions.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowVersionSelector(!showVersionSelector)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800
                          hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <span>v{currentArtifact.version || 1}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showVersionSelector && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200
                          dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          <div className="py-1">
                            {artifactVersions.map((version) => (
                              <button
                                key={version.id}
                                onClick={() => switchToVersion(version)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                                  transition-colors flex items-center justify-between ${
                                  version.id === currentArtifact.id ? 'bg-gray-50 dark:bg-gray-750' : ''
                                }`}
                              >
                                <span>Version {version.version}</span>
                                {version.id === currentArtifact.id && (
                                  <svg className="w-4 h-4 text-[#CC785C]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {currentArtifact.language} • {currentArtifact.type}
                </div>
              </div>

              {/* Artifact Content */}
              <div className="flex-1 overflow-y-auto">
                {isEditingArtifact ? (
                  // Edit Mode - Textarea
                  <div className="h-full flex flex-col">
                    <textarea
                      value={editedArtifactContent}
                      onChange={(e) => setEditedArtifactContent(e.target.value)}
                      className="flex-1 p-4 text-sm font-mono bg-white dark:bg-[#1A1A1A]
                        border-0 focus:outline-none resize-none"
                      placeholder="Edit artifact content..."
                    />
                  </div>
                ) : currentArtifact.type === 'html' ? (
                  // HTML Preview
                  <div className="h-full bg-white">
                    <iframe
                      srcDoc={currentArtifact.content}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts"
                      title="HTML Preview"
                    />
                  </div>
                ) : currentArtifact.type === 'svg' ? (
                  // SVG Preview
                  <div className="h-full bg-white flex items-center justify-center p-4">
                    <div dangerouslySetInnerHTML={{ __html: currentArtifact.content }} />
                  </div>
                ) : (
                  // Code View
                  <pre className="p-4 text-sm font-mono">
                    <code className={`language-${currentArtifact.language}`}>
                      {currentArtifact.content}
                    </code>
                  </pre>
                )}
              </div>

              {/* Artifact Actions */}
              {isEditingArtifact ? (
                // Edit Mode Actions - Save/Cancel
                <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingArtifact(false);
                      setEditedArtifactContent('');
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded
                      hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE}/artifacts/${currentArtifact.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: editedArtifactContent })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to update artifact');
                        }

                        const updatedArtifact = await response.json();

                        // Update the current artifact and artifacts list
                        setCurrentArtifact(updatedArtifact);
                        setArtifacts(artifacts.map(art =>
                          art.id === updatedArtifact.id ? updatedArtifact : art
                        ));

                        // Exit edit mode
                        setIsEditingArtifact(false);
                        setEditedArtifactContent('');
                      } catch (error) {
                        console.error('Error saving artifact:', error);
                        alert('Failed to save artifact changes');
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-[--accent-color] text-white rounded
                      hover:bg-[--accent-hover] transition-colors"
                  >
                    Save
                  </button>
                </div>
              ) : artifacts.length > 1 ? (
                // Navigation Actions - Previous/Next
                <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
                  <button
                    onClick={() => {
                      const currentIndex = artifacts.indexOf(currentArtifact);
                      if (currentIndex > 0) {
                        setCurrentArtifact(artifacts[currentIndex - 1]);
                      }
                    }}
                    disabled={artifacts.indexOf(currentArtifact) === 0}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded
                      hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const currentIndex = artifacts.indexOf(currentArtifact);
                      if (currentIndex < artifacts.length - 1) {
                        setCurrentArtifact(artifacts[currentIndex + 1]);
                      }
                    }}
                    disabled={artifacts.indexOf(currentArtifact) === artifacts.length - 1}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded
                      hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </aside>
          )}
        </div>

        {/* Context Menu  */}
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
            {contextMenuType === 'sidebar' ? (
              <button
                onClick={() => {
                  setShowFolderModal(true)
                  closeContextMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                  flex items-center gap-2"
              >
                <span>📁</span>
                <span>New Folder</span>
              </button>
            ) : contextMenuType === 'folder' ? (
              <button
                onClick={() => {
                  deleteFolder(contextMenu.folderId)
                  closeContextMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                  text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            ) : (
              <>
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
                openShareModal(contextMenu.conversationId)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>🔗</span>
              <span>Share</span>
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
            </>
            )}
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

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Share Conversation</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Anyone with this link can view this conversation (read-only).
              </p>

              {shareLink ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 break-all text-sm">
                    {shareLink}
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="w-full px-4 py-3 bg-claude-orange hover:bg-claude-orange-hover
                      text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {shareLinkCopied ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-claude-orange"></div>
                </div>
              )}

              <button
                onClick={closeShareModal}
                className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600
                  rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Close
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

        {/* Folder Modal */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        createFolder()
                      } else if (e.key === 'Escape') {
                        setShowFolderModal(false)
                        setNewFolderName('')
                      }
                    }}
                    placeholder="Enter folder name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                      rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2
                      focus:ring-claude-orange"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFolderModal(false)
                    setNewFolderName('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createFolder}
                  className="flex-1 px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Re-prompt Modal */}
        {showRepromptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Re-prompt Artifact</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Describe how you'd like to modify the artifact. Your instruction will be sent to Claude along with the current artifact content.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Modification Request
                  </label>
                  <textarea
                    value={repromptInstruction}
                    onChange={(e) => setRepromptInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (repromptInstruction.trim()) {
                          handleReprompt();
                        }
                      } else if (e.key === 'Escape') {
                        setShowRepromptModal(false);
                        setRepromptInstruction('');
                      }
                    }}
                    placeholder="e.g., 'Make the button blue' or 'Add error handling'"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                      rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2
                      focus:ring-claude-orange resize-none"
                    rows="4"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRepromptModal(false);
                    setRepromptInstruction('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (repromptInstruction.trim()) {
                      await handleReprompt();
                    }
                  }}
                  disabled={!repromptInstruction.trim()}
                  className="flex-1 px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
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

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>

              {/* Appearance Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Appearance</h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        theme === 'light'
                          ? 'border-claude-orange bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">☀️</span>
                          <div>
                            <div className="font-medium">Light</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Light mode theme</div>
                          </div>
                        </div>
                        {theme === 'light' && (
                          <svg className="w-5 h-5 text-claude-orange" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        theme === 'dark'
                          ? 'border-claude-orange bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌙</span>
                          <div>
                            <div className="font-medium">Dark</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Dark mode theme</div>
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <svg className="w-5 h-5 text-claude-orange" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('auto')}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        theme === 'auto'
                          ? 'border-claude-orange bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌓</span>
                          <div>
                            <div className="font-medium">Auto</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Match system preferences</div>
                          </div>
                        </div>
                        {theme === 'auto' && (
                          <svg className="w-5 h-5 text-claude-orange" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Font Size Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Font Size</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Message text size</label>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-claude-orange"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Small (12px)</span>
                    <span>Medium (16px)</span>
                    <span>Large (24px)</span>
                  </div>
                </div>
              </div>

              {/* Message Density Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Message Density</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Adjust spacing between messages
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setMessageDensity('compact')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      messageDensity === 'compact'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Compact</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reduced spacing</div>
                    {messageDensity === 'compact' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setMessageDensity('comfortable')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      messageDensity === 'comfortable'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Comfortable</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Normal spacing</div>
                    {messageDensity === 'comfortable' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setMessageDensity('spacious')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      messageDensity === 'spacious'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Spacious</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Increased spacing</div>
                    {messageDensity === 'spacious' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                </div>
              </div>

              {/* Temperature Control Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Temperature</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Control the randomness of Claude's responses
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">More focused</span>
                    <span className="text-sm font-medium">{temperature.toFixed(1)}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">More creative</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-claude-orange
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-claude-orange [&::-moz-range-thumb]:border-0"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>0.0 (Deterministic)</span>
                    <span>1.0 (Creative)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Lower values make responses more focused and consistent. Higher values make them more varied and creative.
                </p>
              </div>

              {/* Max Tokens Control Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Max Tokens</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Control the maximum length of Claude's responses
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Shorter</span>
                    <span className="text-sm font-medium">{maxTokens}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Longer</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="4096"
                    step="100"
                    value={maxTokens}
                    onChange={async (e) => {
                      const newMaxTokens = Number(e.target.value)
                      setMaxTokens(newMaxTokens)
                      // Update current conversation settings if a conversation is active
                      if (currentConversationId) {
                        await updateConversationSettings(currentConversationId, { max_tokens: newMaxTokens })
                      }
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-claude-orange
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-claude-orange [&::-moz-range-thumb]:border-0"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>100 (Brief)</span>
                    <span>4096 (Comprehensive)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Lower values limit response length. Higher values allow longer, more detailed responses.
                </p>
              </div>

              {/* Custom Instructions Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Custom Instructions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Add instructions that will be applied to all conversations
                </p>
                <textarea
                  value={globalCustomInstructions}
                  onChange={(e) => setGlobalCustomInstructions(e.target.value)}
                  onBlur={saveCustomInstructions}
                  placeholder="e.g., Always be concise, Explain like I'm a beginner, etc."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-claude-orange resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  These instructions will be sent with every message to guide Claude's responses
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Done
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
