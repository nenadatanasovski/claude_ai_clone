import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
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

// Typing indicator component with animated dots
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4" role="status" aria-live="polite" aria-label="Claude is thinking">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
        <span className="text-sm text-gray-600 dark:text-gray-400">Claude is thinking</span>
        <div className="flex gap-1" aria-hidden="true">
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
        </div>
      </div>
    </div>
  )
}

// Helper function to group conversations by date
function groupConversationsByDate(conversations) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    previous30Days: [],
    older: []
  }

  conversations.forEach(conv => {
    const convDate = new Date(conv.last_message_at || conv.created_at)
    convDate.setHours(0, 0, 0, 0)

    if (convDate.getTime() === today.getTime()) {
      groups.today.push(conv)
    } else if (convDate.getTime() === yesterday.getTime()) {
      groups.yesterday.push(conv)
    } else if (convDate >= sevenDaysAgo) {
      groups.previous7Days.push(conv)
    } else if (convDate >= thirtyDaysAgo) {
      groups.previous30Days.push(conv)
    } else {
      groups.older.push(conv)
    }
  })

  return groups
}

// Helper function to format timestamp relative to now
function formatRelativeTime(timestamp) {
  if (!timestamp) return ''

  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years} ${years === 1 ? 'year' : 'years'} ago`
  }
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
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
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
  const [existingShares, setExistingShares] = useState([])
  const [revokeConfirmToken, setRevokeConfirmToken] = useState(null)
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
  const [projectAnalytics, setProjectAnalytics] = useState(null) // Project analytics data
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
  const [messageUsage, setMessageUsage] = useState({}) // Map of message ID to usage data
  const [expandedUsage, setExpandedUsage] = useState(new Set()) // Set of message IDs with expanded usage
  const [showConversationCost, setShowConversationCost] = useState(false) // Show conversation cost modal
  const [conversationCostData, setConversationCostData] = useState(null) // Conversation cost data
  const [showUsageDashboard, setShowUsageDashboard] = useState(false) // Show usage dashboard modal
  const [dailyUsageData, setDailyUsageData] = useState(null) // Daily usage data
  const [monthlyUsageData, setMonthlyUsageData] = useState(null) // Monthly usage data
  const [usageView, setUsageView] = useState('daily') // 'daily' or 'monthly'
  const [contextWindowTokens, setContextWindowTokens] = useState(0) // Current conversation token count
  const [showPromptLibrary, setShowPromptLibrary] = useState(false) // Show prompt library modal
  const [prompts, setPrompts] = useState([]) // All prompts in library
  const [selectedCategory, setSelectedCategory] = useState('All') // Filter category
  const [promptCategories, setPromptCategories] = useState(['All', 'Coding', 'Writing', 'Analysis', 'General'])
  const [newPromptTitle, setNewPromptTitle] = useState('')
  const [newPromptDescription, setNewPromptDescription] = useState('')
  const [newPromptTemplate, setNewPromptTemplate] = useState('')
  const [newPromptCategory, setNewPromptCategory] = useState('General')
  const [newPromptTags, setNewPromptTags] = useState('')
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false) // Show save as template modal
  const [saveAsTemplateConversationId, setSaveAsTemplateConversationId] = useState(null) // Conversation to save as template
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('General')
  const [templates, setTemplates] = useState([]) // All conversation templates
  const [showTemplatesModal, setShowTemplatesModal] = useState(false) // Show templates modal
  const [showSaveAsProjectTemplateModal, setShowSaveAsProjectTemplateModal] = useState(false) // Show save project as template modal
  const [saveAsProjectTemplateId, setSaveAsProjectTemplateId] = useState(null) // Project to save as template
  const [projectTemplateName, setProjectTemplateName] = useState('')
  const [projectTemplateDescription, setProjectTemplateDescription] = useState('')
  const [projectTemplateCategory, setProjectTemplateCategory] = useState('General')
  const [projectTemplates, setProjectTemplates] = useState([]) // All project templates
  const [showProjectTemplatesModal, setShowProjectTemplatesModal] = useState(false) // Show project templates modal
  const [showExampleConversations, setShowExampleConversations] = useState(false) // Show example conversations modal
  const [exampleConversations, setExampleConversations] = useState([]) // List of example conversations
  const [showTipsModal, setShowTipsModal] = useState(false) // Show tips modal
  const [tips, setTips] = useState([]) // All tips organized by category
  const [selectedTipCategory, setSelectedTipCategory] = useState('All') // Selected tip category filter
  const [readTips, setReadTips] = useState(() => {
    const saved = localStorage.getItem('readTips')
    return saved ? JSON.parse(saved) : []
  }) // Array of tip IDs that have been marked as read
  const [showCommandPalette, setShowCommandPalette] = useState(false) // Show command palette modal
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('') // Search query in command palette
  const [messageSuggestions, setMessageSuggestions] = useState({}) // Suggestions for each message { messageId: [suggestions] }
  const [relatedPrompts, setRelatedPrompts] = useState([]) // Related prompts based on conversation topic
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editedMessageContent, setEditedMessageContent] = useState('')
  const [branches, setBranches] = useState([]) // Conversation branches
  const [currentBranch, setCurrentBranch] = useState(null) // Currently selected branch path
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256) // Sidebar width in pixels (min: 200, max: 500)
  const [isResizing, setIsResizing] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'light'
  }) // 'light', 'dark', or 'auto'
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize')
    return saved ? Number(saved) : 16
  }) // Font size in pixels (12-24)
  const [messageDensity, setMessageDensity] = useState(() => {
    const saved = localStorage.getItem('messageDensity')
    return saved || 'comfortable'
  }) // 'compact', 'comfortable', or 'spacious'
  const [codeTheme, setCodeTheme] = useState(() => {
    const saved = localStorage.getItem('codeTheme')
    return saved || 'github-dark'
  }) // Code syntax highlighting theme
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast')
    return saved === 'true'
  }) // High contrast mode for accessibility
  const [saveConversationHistory, setSaveConversationHistory] = useState(() => {
    const saved = localStorage.getItem('saveConversationHistory')
    return saved !== 'false' // Default to true (save history)
  }) // Privacy setting: whether to save conversation history
  const [user, setUser] = useState(null) // User profile data
  const [showProfileMenu, setShowProfileMenu] = useState(false) // Show profile dropdown menu
  const [showProfileModal, setShowProfileModal] = useState(false) // Show profile edit modal
  const [editedUserName, setEditedUserName] = useState('')
  const [editedUserEmail, setEditedUserEmail] = useState('')
  const [editedUserAvatar, setEditedUserAvatar] = useState('')
  const [apiKeys, setApiKeys] = useState([]) // List of user API keys
  const [showAddApiKeyModal, setShowAddApiKeyModal] = useState(false) // Show add API key modal
  const [newApiKeyName, setNewApiKeyName] = useState('') // Name for new API key
  const [newApiKeyValue, setNewApiKeyValue] = useState('') // Value for new API key
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('reducedMotion')
    if (saved !== null) return saved === 'true'
    // Default to system preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }) // Reduced motion for accessibility
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language')
    return saved || 'en'
  }) // UI language preference
  const [showOnboardingTour, setShowOnboardingTour] = useState(() => {
    const completed = localStorage.getItem('onboardingCompleted')
    return !completed // Show tour if not completed
  }) // Onboarding tour visibility
  const [tourStep, setTourStep] = useState(0) // Current step in onboarding tour
  const [globalCustomInstructions, setGlobalCustomInstructions] = useState('')
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('temperature')
    return saved ? Number(saved) : 1.0
  }) // Temperature (0.0-1.0)
  const [maxTokens, setMaxTokens] = useState(() => {
    const saved = localStorage.getItem('maxTokens')
    return saved ? Number(saved) : 4096
  }) // Max tokens (100-4096)
  const [errorMessage, setErrorMessage] = useState(null) // Error message to display
  const [lastFailedMessage, setLastFailedMessage] = useState(null) // Last failed message for retry
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
  const settingsModalRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Model options with context window limits
  const models = [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4.5',
      description: 'Most capable model',
      contextWindow: 200000,
      strengths: ['Balanced performance', 'Complex reasoning', 'Code generation'],
      pricing: {
        input: '$3.00',
        output: '$15.00',
        per: '/ million tokens'
      }
    },
    {
      id: 'claude-haiku-4-20250514',
      name: 'Claude Haiku 4.5',
      description: 'Fast and efficient',
      contextWindow: 200000,
      strengths: ['Fast responses', 'Cost-effective', 'Simple tasks'],
      pricing: {
        input: '$0.25',
        output: '$1.25',
        per: '/ million tokens'
      }
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4.1',
      description: 'Most intelligent',
      contextWindow: 200000,
      strengths: ['Complex analysis', 'Creative writing', 'Advanced reasoning'],
      pricing: {
        input: '$15.00',
        output: '$75.00',
        per: '/ million tokens'
      }
    }
  ]

  // Command palette commands
  const commands = [
    {
      id: 'new-conversation',
      name: 'New Conversation',
      description: 'Start a new chat',
      icon: '💬',
      action: () => {
        createNewConversation()
        setShowCommandPalette(false)
      }
    },
    {
      id: 'search-conversations',
      name: 'Search Conversations',
      description: 'Search through your conversations',
      icon: '🔍',
      action: () => {
        setShowCommandPalette(false)
        // Focus search input in sidebar
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Search conversations..."]')
          if (searchInput) searchInput.focus()
        }, 100)
      }
    },
    {
      id: 'show-prompts',
      name: 'Prompt Library',
      description: 'Browse and use saved prompts',
      icon: '📝',
      action: () => {
        setShowCommandPalette(false)
        loadPromptLibrary()
        setShowPromptLibrary(true)
      }
    },
    {
      id: 'show-examples',
      name: 'Example Conversations',
      description: 'Start with a pre-made conversation',
      icon: '📚',
      action: () => {
        setShowCommandPalette(false)
        loadExampleConversations()
        setShowExampleConversations(true)
      }
    },
    {
      id: 'show-usage',
      name: 'Usage Dashboard',
      description: 'View token usage and costs',
      icon: '📊',
      action: () => {
        setShowCommandPalette(false)
        loadUsageDashboard()
        setShowUsageDashboard(true)
      }
    },
    {
      id: 'show-settings',
      name: 'Settings',
      description: 'Customize your experience',
      icon: '⚙️',
      action: () => {
        setShowCommandPalette(false)
        setShowSettingsModal(true)
      }
    },
    {
      id: 'keyboard-shortcuts',
      name: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: '⌨️',
      action: () => {
        setShowCommandPalette(false)
        setShowKeyboardShortcutsModal(true)
      }
    },
    {
      id: 'toggle-theme',
      name: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '🌓',
      action: () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
        setShowCommandPalette(false)
      }
    },
    {
      id: 'new-project',
      name: 'New Project',
      description: 'Create a new project',
      icon: '📁',
      action: () => {
        setShowCommandPalette(false)
        setShowProjectModal(true)
      }
    },
    {
      id: 'export-conversation',
      name: 'Export Conversation',
      description: 'Export current conversation',
      icon: '💾',
      action: () => {
        if (currentConversation) {
          setShowCommandPalette(false)
          setShowExportModal(true)
        }
      }
    },
    {
      id: 'share-conversation',
      name: 'Share Conversation',
      description: 'Share current conversation via link',
      icon: '🔗',
      action: () => {
        if (currentConversation) {
          setShowCommandPalette(false)
          setShowShareModal(true)
        }
      }
    }
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
    loadUser()
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

  // Save theme setting to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  // Save font size setting to localStorage
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString())
  }, [fontSize])

  // Save message density setting to localStorage
  useEffect(() => {
    localStorage.setItem('messageDensity', messageDensity)
  }, [messageDensity])

  // Save code theme setting to localStorage
  useEffect(() => {
    localStorage.setItem('codeTheme', codeTheme)
  }, [codeTheme])

  // Load code theme CSS dynamically
  useEffect(() => {
    // Remove any existing highlight.js stylesheets
    const existingStylesheets = document.querySelectorAll('link[href*="highlight.js/styles"]')
    existingStylesheets.forEach(link => link.remove())

    // Add new stylesheet for selected theme
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${codeTheme}.min.css`
    document.head.appendChild(link)

    return () => {
      link.remove()
    }
  }, [codeTheme])

  // Save high contrast setting to localStorage
  useEffect(() => {
    localStorage.setItem('highContrast', highContrast.toString())
  }, [highContrast])

  // Save conversation history setting to localStorage
  useEffect(() => {
    localStorage.setItem('saveConversationHistory', saveConversationHistory.toString())
  }, [saveConversationHistory])

  // Save reduced motion setting to localStorage
  useEffect(() => {
    localStorage.setItem('reducedMotion', reducedMotion.toString())
  }, [reducedMotion])

  // Save language setting to localStorage
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  // Save temperature setting to localStorage
  useEffect(() => {
    localStorage.setItem('temperature', temperature.toString())
  }, [temperature])

  // Save maxTokens setting to localStorage
  useEffect(() => {
    localStorage.setItem('maxTokens', maxTokens.toString())
  }, [maxTokens])

  // Generate related prompts when messages change
  useEffect(() => {
    if (messages.length >= 2 && !isStreaming) {
      const prompts = generateRelatedPrompts(messages)
      setRelatedPrompts(prompts)
    } else {
      setRelatedPrompts([])
    }
  }, [messages, isStreaming])

  // Render Mermaid diagrams when artifact changes
  useEffect(() => {
    if (currentArtifact && currentArtifact.type === 'mermaid' && window.mermaid) {
      const elementId = `mermaid-diagram-${currentArtifact.id}`;
      const element = document.getElementById(elementId);
      if (element) {
        // Clear previous content
        element.innerHTML = currentArtifact.content;
        // Render the diagram
        window.mermaid.run({
          nodes: [element]
        }).catch(err => {
          console.error('Mermaid rendering error:', err);
          element.innerHTML = `<div class="text-red-500 p-4">Error rendering diagram: ${err.message}</div>`;
        });
      }
    }
  }, [currentArtifact])

  // Command palette keyboard shortcut (Cmd/Ctrl+K) and conversation navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K on Mac or Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault() // Prevent browser default behavior
        setShowCommandPalette(prev => !prev) // Toggle command palette
        setCommandPaletteQuery('') // Reset search query
      }
      // Also handle Escape to close command palette
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false)
        setCommandPaletteQuery('')
      }
      // Handle Escape to close keyboard shortcuts modal
      if (e.key === 'Escape' && showKeyboardShortcutsModal) {
        setShowKeyboardShortcutsModal(false)
      }
      // Handle ? to open keyboard shortcuts modal
      if (e.key === '?' && !showCommandPalette && !showKeyboardShortcutsModal) {
        // Only if not typing in an input or textarea
        const activeElement = document.activeElement
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowKeyboardShortcutsModal(true)
        }
      }

      // Conversation navigation shortcuts (Cmd/Ctrl+Up/Down arrows)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault() // Prevent page scrolling

        // Get the filtered and sorted conversations list
        const filteredConvos = conversations.filter(conv => {
          if (showArchived && !conv.is_archived) return false
          if (!showArchived && conv.is_archived) return false
          if (searchQuery && !conv.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
          return true
        })

        if (filteredConvos.length === 0) return

        // Find current conversation index
        const currentIndex = filteredConvos.findIndex(conv => conv.id === currentConversationId)

        if (e.key === 'ArrowUp') {
          // Move to previous conversation
          if (currentIndex > 0) {
            const prevConv = filteredConvos[currentIndex - 1]
            setCurrentConversationId(prevConv.id)
          }
        } else if (e.key === 'ArrowDown') {
          // Move to next conversation
          if (currentIndex >= 0 && currentIndex < filteredConvos.length - 1) {
            const nextConv = filteredConvos[currentIndex + 1]
            setCurrentConversationId(nextConv.id)
          } else if (currentIndex === -1 && filteredConvos.length > 0) {
            // If no conversation is selected, select the first one
            setCurrentConversationId(filteredConvos[0].id)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCommandPalette, showKeyboardShortcutsModal, conversations, currentConversationId, showArchived, searchQuery])

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

  // Focus management for settings modal
  useEffect(() => {
    if (showSettingsModal) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement

      // Focus the modal after a short delay to ensure it's rendered
      setTimeout(() => {
        if (settingsModalRef.current) {
          // Find the first focusable element in the modal
          const focusable = settingsModalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (focusable) {
            focusable.focus()
          }
        }
      }, 100)
    } else if (previousFocusRef.current) {
      // Return focus to the element that had focus before modal opened
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [showSettingsModal])

  // Focus management for keyboard shortcuts modal
  useEffect(() => {
    if (showKeyboardShortcutsModal) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement
    } else if (previousFocusRef.current && !showSettingsModal) {
      // Return focus only if no other modal is open
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [showKeyboardShortcutsModal, showSettingsModal])

  // Load API keys when Settings modal opens
  useEffect(() => {
    if (showSettingsModal) {
      loadApiKeys()
    }
  }, [showSettingsModal])

  const loadUser = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`)
      const data = await response.json()
      setUser(data)
      setEditedUserName(data.name || '')
      setEditedUserEmail(data.email || '')
      setEditedUserAvatar(data.avatar_url || '')
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const saveProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedUserName,
          email: editedUserEmail,
          avatar_url: editedUserAvatar
        })
      })
      const data = await response.json()
      setUser(data)
      setShowProfileModal(false)
      // Reload user to ensure UI is updated
      await loadUser()
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  // API Key Management Functions
  const loadApiKeys = async () => {
    try {
      const response = await fetch(`${API_BASE}/keys`)
      const data = await response.json()
      setApiKeys(data)
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
  }

  const addApiKey = async () => {
    try {
      if (!newApiKeyName.trim() || !newApiKeyValue.trim()) {
        alert('Please provide both a key name and API key value')
        return
      }

      const response = await fetch(`${API_BASE}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: newApiKeyName,
          api_key: newApiKeyValue
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add API key')
      }

      const data = await response.json()
      setApiKeys([data, ...apiKeys])
      setShowAddApiKeyModal(false)
      setNewApiKeyName('')
      setNewApiKeyValue('')
    } catch (error) {
      console.error('Error adding API key:', error)
      alert('Failed to add API key. Please try again.')
    }
  }

  const deleteApiKey = async (keyId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')
      if (!confirmed) return

      const response = await fetch(`${API_BASE}/keys/${keyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete API key')
      }

      setApiKeys(apiKeys.filter(key => key.id !== keyId))
    } catch (error) {
      console.error('Error deleting API key:', error)
      alert('Failed to delete API key. Please try again.')
    }
  }

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

      // Calculate total tokens from messages for context window indicator
      const totalTokens = data.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
      console.log('[Context Window] Loading messages, total tokens:', totalTokens, 'from', data.length, 'messages')
      setContextWindowTokens(totalTokens)

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

  const loadMessageUsage = async (messageId) => {
    // Check if we already have this usage data cached
    if (messageUsage[messageId]) {
      return messageUsage[messageId]
    }

    try {
      const response = await fetch(`${API_BASE}/messages/${messageId}/usage`)
      const data = await response.json()

      // Cache the usage data
      setMessageUsage(prev => ({
        ...prev,
        [messageId]: data
      }))

      return data
    } catch (error) {
      console.error('Error loading message usage:', error)
      return null
    }
  }

  const toggleUsageExpanded = async (messageId) => {
    const newExpanded = new Set(expandedUsage)

    if (expandedUsage.has(messageId)) {
      // Collapse
      newExpanded.delete(messageId)
    } else {
      // Expand and fetch usage data if we don't have it yet
      newExpanded.add(messageId)
      if (!messageUsage[messageId]) {
        await loadMessageUsage(messageId)
      }
    }

    setExpandedUsage(newExpanded)
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

  const loadConversationCost = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/cost`)
      if (response.ok) {
        const costData = await response.json()
        setConversationCostData(costData)
        setShowConversationCost(true)
      } else {
        console.error('Failed to load conversation cost')
      }
    } catch (error) {
      console.error('Error loading conversation cost:', error)
    }
  }

  const loadDailyUsage = async () => {
    try {
      const response = await fetch(`${API_BASE}/usage/daily`)
      if (response.ok) {
        const usageData = await response.json()
        setDailyUsageData(usageData)
        setUsageView('daily')
        setShowUsageDashboard(true)
      } else {
        console.error('Failed to load daily usage')
      }
    } catch (error) {
      console.error('Error loading daily usage:', error)
    }
  }

  const loadMonthlyUsage = async () => {
    try {
      const response = await fetch(`${API_BASE}/usage/monthly`)
      if (response.ok) {
        const usageData = await response.json()
        setMonthlyUsageData(usageData)
        setUsageView('monthly')
        setShowUsageDashboard(true)
      } else {
        console.error('Failed to load monthly usage')
      }
    } catch (error) {
      console.error('Error loading monthly usage:', error)
    }
  }

  // Load all prompts from library
  const loadPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/prompts/library`)
      if (response.ok) {
        const promptsData = await response.json()
        setPrompts(promptsData)
      } else {
        console.error('Failed to load prompts')
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
    }
  }

  // Load example conversations
  const loadExampleConversations = async () => {
    try {
      console.log('Loading example conversations from:', `${API_BASE}/prompts/examples`)
      const response = await fetch(`${API_BASE}/prompts/examples`)
      console.log('Response status:', response.status, 'ok:', response.ok)
      if (response.ok) {
        const examples = await response.json()
        console.log('Loaded examples:', examples.length, examples)
        setExampleConversations(examples)
      } else {
        console.error('Failed to load example conversations, status:', response.status)
      }
    } catch (error) {
      console.error('Error loading example conversations:', error)
    }
  }

  // Start an example conversation
  const startExampleConversation = async (example) => {
    try {
      // Create a new conversation
      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: example.title,
          model: selectedModel,
          project_id: currentProjectId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const newConversation = await response.json()

      // Add all messages from the example
      for (const msg of example.messages) {
        await fetch(`${API_BASE}/conversations/${newConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: msg.role,
            content: msg.content,
            is_example: true // Mark as example so it doesn't call the API
          })
        })
      }

      // Switch to the new conversation
      setCurrentConversationId(newConversation.id)
      setShowExampleConversations(false)

      // Reload conversations and messages
      await loadConversations()
      await loadMessages(newConversation.id)
    } catch (error) {
      console.error('Error starting example conversation:', error)
      alert('Failed to start example conversation')
    }
  }

  // Load tips and best practices
  const loadTips = () => {
    // Static tips data organized by category
    const tipsData = [
      {
        id: 1,
        category: 'Getting Started',
        title: 'Use Clear and Specific Prompts',
        content: 'The more specific your prompt, the better the response. Instead of "Write code," try "Write a Python function that calculates factorial."',
        actionable: 'Be specific in your requests'
      },
      {
        id: 2,
        category: 'Getting Started',
        title: 'Provide Context',
        content: 'Give Claude context about your project, goals, and constraints. This helps generate more relevant responses.',
        actionable: 'Share background information'
      },
      {
        id: 3,
        category: 'Getting Started',
        title: 'Break Down Complex Tasks',
        content: 'For complex projects, break them into smaller steps and work through them one at a time.',
        actionable: 'Start with small, focused tasks'
      },
      {
        id: 4,
        category: 'Productivity',
        title: 'Use Keyboard Shortcuts',
        content: 'Press Enter to send messages and Shift+Enter for new lines. Use Cmd/Ctrl+K to open the command palette.',
        actionable: 'Master keyboard shortcuts'
      },
      {
        id: 5,
        category: 'Productivity',
        title: 'Organize with Projects',
        content: 'Group related conversations into projects for better organization and context sharing.',
        actionable: 'Create projects for different topics'
      },
      {
        id: 6,
        category: 'Productivity',
        title: 'Save Useful Prompts',
        content: 'Use the prompt library to save and reuse prompts that work well for you.',
        actionable: 'Build your prompt library'
      },
      {
        id: 7,
        category: 'Productivity',
        title: 'Use Templates',
        content: 'Save conversations as templates to quickly start similar discussions in the future.',
        actionable: 'Create conversation templates'
      },
      {
        id: 8,
        category: 'Code & Development',
        title: 'Request Code Explanations',
        content: 'Ask Claude to explain code step-by-step to understand how it works.',
        actionable: 'Ask for detailed explanations'
      },
      {
        id: 9,
        category: 'Code & Development',
        title: 'Iterate on Code',
        content: 'Don\'t hesitate to ask for improvements, optimizations, or different approaches to code.',
        actionable: 'Request refinements and alternatives'
      },
      {
        id: 10,
        category: 'Code & Development',
        title: 'Copy Code Easily',
        content: 'Use the copy button on code blocks to quickly copy code to your clipboard.',
        actionable: 'Click the copy button on code blocks'
      },
      {
        id: 11,
        category: 'Writing & Content',
        title: 'Specify Tone and Style',
        content: 'Tell Claude the desired tone (formal, casual, technical) and style for better results.',
        actionable: 'Define your writing style'
      },
      {
        id: 12,
        category: 'Writing & Content',
        title: 'Provide Examples',
        content: 'Show Claude examples of the style or format you want, and it will match them.',
        actionable: 'Share example outputs'
      },
      {
        id: 13,
        category: 'Writing & Content',
        title: 'Ask for Multiple Versions',
        content: 'Request multiple variations of content to find the one that works best.',
        actionable: 'Explore different approaches'
      },
      {
        id: 14,
        category: 'Advanced Features',
        title: 'Adjust Model Settings',
        content: 'Switch between Claude models based on your needs: Sonnet for balance, Haiku for speed, Opus for complex reasoning.',
        actionable: 'Choose the right model'
      },
      {
        id: 15,
        category: 'Advanced Features',
        title: 'Use Custom Instructions',
        content: 'Set custom instructions in settings to give Claude consistent context across conversations.',
        actionable: 'Configure custom instructions'
      },
      {
        id: 16,
        category: 'Advanced Features',
        title: 'Track Your Usage',
        content: 'Monitor token usage and costs in the usage dashboard to stay within your budget.',
        actionable: 'Check the usage dashboard'
      },
      {
        id: 17,
        category: 'Best Practices',
        title: 'Review and Verify',
        content: 'Always review Claude\'s responses, especially for critical information or code.',
        actionable: 'Double-check important outputs'
      },
      {
        id: 18,
        category: 'Best Practices',
        title: 'Provide Feedback',
        content: 'If a response isn\'t quite right, explain what\'s wrong and Claude can improve it.',
        actionable: 'Give specific feedback'
      },
      {
        id: 19,
        category: 'Best Practices',
        title: 'Search Your Conversations',
        content: 'Use the search feature to find past conversations and avoid repeating questions.',
        actionable: 'Search before asking again'
      },
      {
        id: 20,
        category: 'Best Practices',
        title: 'Export Important Conversations',
        content: 'Export conversations to JSON or Markdown to keep records of valuable discussions.',
        actionable: 'Save important conversations'
      }
    ]
    setTips(tipsData)
  }

  // Mark a tip as read
  const markTipAsRead = (tipId) => {
    if (!readTips.includes(tipId)) {
      const updatedReadTips = [...readTips, tipId]
      setReadTips(updatedReadTips)
      localStorage.setItem('readTips', JSON.stringify(updatedReadTips))
    }
  }

  // Dismiss a tip (same as marking as read)
  const dismissTip = (tipId) => {
    markTipAsRead(tipId)
  }

  // Get tip categories
  const getTipCategories = () => {
    const categories = ['All', ...new Set(tips.map(tip => tip.category))]
    return categories
  }

  // Filter tips by category
  const getFilteredTips = () => {
    if (selectedTipCategory === 'All') {
      return tips
    }
    return tips.filter(tip => tip.category === selectedTipCategory)
  }

  // Open tips modal
  const openTipsModal = () => {
    loadTips()
    setShowTipsModal(true)
  }

  // Close tips modal
  const closeTipsModal = () => {
    setShowTipsModal(false)
  }

  // Create a new prompt
  const createPrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptTemplate.trim()) {
      alert('Please provide a title and prompt template')
      return
    }

    try {
      const tags = newPromptTags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      const response = await fetch(`${API_BASE}/prompts/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPromptTitle,
          description: newPromptDescription,
          prompt_template: newPromptTemplate,
          category: newPromptCategory,
          tags
        })
      })

      if (response.ok) {
        const newPrompt = await response.json()
        setPrompts([newPrompt, ...prompts])
        // Reset form
        setNewPromptTitle('')
        setNewPromptDescription('')
        setNewPromptTemplate('')
        setNewPromptCategory('General')
        setNewPromptTags('')
      } else {
        console.error('Failed to create prompt')
      }
    } catch (error) {
      console.error('Error creating prompt:', error)
    }
  }

  // Use a saved prompt
  const usePrompt = (prompt) => {
    setInputMessage(prompt.prompt_template)
    setShowPromptLibrary(false)
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

  // Generate contextual follow-up suggestions based on message content
  const generateSuggestions = (messageContent, messageRole) => {
    if (messageRole !== 'assistant') return []

    const content = messageContent.toLowerCase()
    const suggestions = []

    // Code-related suggestions
    if (content.includes('function') || content.includes('code') || content.includes('def ') || content.includes('class ')) {
      suggestions.push('Can you explain this code in more detail?')
      suggestions.push('How can I optimize this code?')
      suggestions.push('Can you add error handling to this?')
    }
    // Writing/text suggestions
    else if (content.includes('here is') || content.includes('here\'s') || content.length > 200) {
      suggestions.push('Can you make this more concise?')
      suggestions.push('Can you expand on this with more details?')
      suggestions.push('Can you provide an example?')
    }
    // Question/explanation suggestions
    else if (content.includes('?') || content.includes('explain') || content.includes('understand')) {
      suggestions.push('Can you provide a specific example?')
      suggestions.push('What are the pros and cons?')
      suggestions.push('How does this compare to alternatives?')
    }
    // Generic fallback suggestions
    else {
      suggestions.push('Tell me more about this')
      suggestions.push('Can you give me an example?')
      suggestions.push('What are the next steps?')
    }

    // Return 2-3 suggestions
    return suggestions.slice(0, Math.min(3, suggestions.length))
  }

  // Handle clicking a suggestion - populate input field
  const handleSuggestionClick = (suggestionText) => {
    setInputValue(suggestionText)
    // Focus the input field
    const textarea = document.querySelector('textarea[placeholder*="Message"]')
    if (textarea) {
      textarea.focus()
    }
  }

  // Generate related prompts based on conversation topic
  const generateRelatedPrompts = (conversationMessages) => {
    if (!conversationMessages || conversationMessages.length === 0) {
      return []
    }

    // Analyze conversation content to determine topic
    const allContent = conversationMessages.map(m => m.content).join(' ').toLowerCase()

    const prompts = []

    // Programming/code related
    if (allContent.includes('code') || allContent.includes('function') || allContent.includes('program') ||
        allContent.includes('javascript') || allContent.includes('python') || allContent.includes('react')) {
      prompts.push('How can I test this code?')
      prompts.push('What are common pitfalls to avoid?')
      prompts.push('Can you show me a more advanced example?')
    }
    // Writing/content related
    else if (allContent.includes('write') || allContent.includes('article') || allContent.includes('essay') ||
             allContent.includes('blog') || allContent.includes('content')) {
      prompts.push('How can I make this more engaging?')
      prompts.push('What tone would work best for my audience?')
      prompts.push('Can you help me create an outline?')
    }
    // Data/analysis related
    else if (allContent.includes('data') || allContent.includes('analysis') || allContent.includes('chart') ||
             allContent.includes('graph') || allContent.includes('statistics')) {
      prompts.push('What other visualizations would help?')
      prompts.push('How should I present this data?')
      prompts.push('What insights can I derive from this?')
    }
    // Design/UI related
    else if (allContent.includes('design') || allContent.includes('ui') || allContent.includes('ux') ||
             allContent.includes('interface') || allContent.includes('layout')) {
      prompts.push('What are current design trends for this?')
      prompts.push('How can I improve accessibility?')
      prompts.push('What color scheme would work well?')
    }
    // Business/strategy related
    else if (allContent.includes('business') || allContent.includes('strategy') || allContent.includes('marketing') ||
             allContent.includes('product') || allContent.includes('growth')) {
      prompts.push('What are the key metrics to track?')
      prompts.push('How do competitors approach this?')
      prompts.push('What are potential risks to consider?')
    }
    // Learning/education related
    else if (allContent.includes('learn') || allContent.includes('understand') || allContent.includes('explain') ||
             allContent.includes('how') || allContent.includes('why')) {
      prompts.push('Can you explain this in simpler terms?')
      prompts.push('What resources can help me learn more?')
      prompts.push('What are practical applications of this?')
    }
    // Generic fallback prompts
    else {
      prompts.push('What else should I know about this topic?')
      prompts.push('Can you provide more examples?')
      prompts.push('How does this compare to alternatives?')
    }

    // Limit to 3 prompts
    return prompts.slice(0, 3)
  }

  const handleRelatedPromptClick = (promptText) => {
    setInputValue(promptText)
    const textarea = document.querySelector('textarea[placeholder*="Message"]')
    if (textarea) {
      textarea.focus()
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

      // Check for errors before processing response
      if (!response.ok) {
        // Extract error details from response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || 'Failed to send message')
        error.status = response.status
        error.details = errorData.details
        throw error
      }

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
                    const oldId = assistantMessage.id
                    assistantMessage.id = data.messageId

                    // Update the messages state with the new ID
                    setMessages(prev => {
                      const newMessages = [...prev]
                      newMessages[newMessages.length - 1] = { ...assistantMessage }
                      return newMessages
                    })

                    // Update suggestions mapping if ID changed
                    if (oldId !== data.messageId) {
                      setMessageSuggestions(prev => {
                        const suggestions = prev[oldId]
                        if (suggestions) {
                          const newState = { ...prev }
                          delete newState[oldId]
                          newState[data.messageId] = suggestions
                          return newState
                        }
                        return prev
                      })
                    }

                    // Update context window tokens if message has token data
                    if (data.tokens && !isNaN(data.tokens)) {
                      assistantMessage.tokens = data.tokens
                      console.log('[Context Window] Received tokens in done message:', data.tokens)
                      setContextWindowTokens(prev => {
                        const prevTokens = isNaN(prev) ? 0 : prev
                        const newTotal = prevTokens + parseInt(data.tokens, 10)
                        console.log('[Context Window] Updated total:', prevTokens, '+', data.tokens, '=', newTotal)
                        return newTotal
                      })
                    }
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

          // Generate suggestions for the assistant message
          if (assistantMessage.id && assistantMessage.content) {
            const suggestions = generateSuggestions(assistantMessage.content, assistantMessage.role)
            const messageId = assistantMessage.id
            if (suggestions.length > 0) {
              setMessageSuggestions(prev => ({
                ...prev,
                [messageId]: suggestions
              }))
            }
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

        // Determine user-friendly error message
        let friendlyMessage = 'An error occurred while sending your message.'

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || !navigator.onLine) {
          friendlyMessage = 'Network connection failed. Please check your internet connection and try again.'
        } else if (error.status === 401 || error.message.includes('401') || error.message.includes('API key') || error.message.includes('Authentication failed')) {
          friendlyMessage = 'Authentication failed. Please check your API key configuration.'
        } else if (error.status === 429 || error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          friendlyMessage = 'Rate limit exceeded. Please wait a moment and try again.'
        } else if (error.message.includes('timeout')) {
          friendlyMessage = 'Request timed out. Please try again.'
        }

        // Store the error and the message for retry
        setErrorMessage(friendlyMessage)
        setLastFailedMessage({
          content: messageText,
          conversationId: conversationId,
          images: selectedImages
        })
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      streamReaderRef.current = null
      abortControllerRef.current = null

      // Focus management: Return focus to textarea after message is sent
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
    }
  }

  const retryLastMessage = async () => {
    if (!lastFailedMessage || isLoading) {
      return
    }

    const messageText = lastFailedMessage.content
    const images = lastFailedMessage.images || []

    // Clear the error and failed message state
    setErrorMessage(null)
    setLastFailedMessage(null)
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
        images: images.length > 0 ? images : null,
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

      if (images.length > 0) {
        messagePayload.images = images.map(img => ({
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

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        // Handle streaming response (same as sendMessage)
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
                    const oldId = assistantMessage.id
                    assistantMessage.id = data.messageId

                    // Update the messages state with the new ID
                    setMessages(prev => {
                      const newMessages = [...prev]
                      newMessages[newMessages.length - 1] = { ...assistantMessage }
                      return newMessages
                    })

                    // Update suggestions mapping if ID changed
                    if (oldId !== data.messageId) {
                      setMessageSuggestions(prev => {
                        const suggestions = prev[oldId]
                        if (suggestions) {
                          const newState = { ...prev }
                          delete newState[oldId]
                          newState[data.messageId] = suggestions
                          return newState
                        }
                        return prev
                      })
                    }

                    // Update context window tokens if message has token data
                    if (data.tokens && !isNaN(data.tokens)) {
                      assistantMessage.tokens = data.tokens
                      console.log('[Context Window] Received tokens in done message:', data.tokens)
                      setContextWindowTokens(prev => {
                        const prevTokens = isNaN(prev) ? 0 : prev
                        const newTotal = prevTokens + parseInt(data.tokens, 10)
                        console.log('[Context Window] Updated total:', prevTokens, '+', data.tokens, '=', newTotal)
                        return newTotal
                      })
                    }
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
        await loadMessages(conversationId)
      }

      // Reload conversations to update the list
      loadConversations()
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted by user')
      } else {
        console.error('Error retrying message:', error)

        // Show error again
        let friendlyMessage = 'An error occurred while sending your message.'

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || !navigator.onLine) {
          friendlyMessage = 'Network connection failed. Please check your internet connection and try again.'
        } else if (error.status === 401 || error.message.includes('401') || error.message.includes('API key') || error.message.includes('Authentication failed')) {
          friendlyMessage = 'Authentication failed. Please check your API key configuration.'
        } else if (error.status === 429 || error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          friendlyMessage = 'Rate limit exceeded. Please wait a moment and try again.'
        } else if (error.message.includes('timeout')) {
          friendlyMessage = 'Request timed out. Please try again.'
        }

        setErrorMessage(friendlyMessage)
        setLastFailedMessage({
          content: messageText,
          conversationId: conversationId,
          images: images
        })
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
                    const oldId = assistantMessage.id
                    assistantMessage.id = data.messageId

                    // Update the messages state with the new ID
                    setMessages(prev => {
                      const newMessages = [...prev]
                      newMessages[newMessages.length - 1] = { ...assistantMessage }
                      return newMessages
                    })

                    // Update suggestions mapping if ID changed
                    if (oldId !== data.messageId) {
                      setMessageSuggestions(prev => {
                        const suggestions = prev[oldId]
                        if (suggestions) {
                          const newState = { ...prev }
                          delete newState[oldId]
                          newState[data.messageId] = suggestions
                          return newState
                        }
                        return prev
                      })
                    }

                    // Update context window tokens if message has token data
                    if (data.tokens && !isNaN(data.tokens)) {
                      assistantMessage.tokens = data.tokens
                      console.log('[Context Window] Received tokens in done message:', data.tokens)
                      setContextWindowTokens(prev => {
                        const prevTokens = isNaN(prev) ? 0 : prev
                        const newTotal = prevTokens + parseInt(data.tokens, 10)
                        console.log('[Context Window] Updated total:', prevTokens, '+', data.tokens, '=', newTotal)
                        return newTotal
                      })
                    }
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

  const handleSuggestedPrompt = async (prompt) => {
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
        content: prompt,
        images: null,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Prepare message payload
      const messagePayload = {
        content: prompt,
        role: 'user',
        temperature: temperature,
        maxTokens: maxTokens
      }

      // Clear selected images since suggested prompts don't include images
      setSelectedImages([])

      // Send message to backend
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'user',
          content: prompt,
          model: selectedModel,
          temperature: temperature,
          maxTokens: maxTokens
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        // Extract error details from response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || 'Failed to send message')
        error.status = response.status
        error.details = errorData.details
        throw error
      }

      // Handle streaming response
      setIsStreaming(true)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''
      let currentMessageId = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'message_start') {
                currentMessageId = parsed.message.id
                setMessages(prev => [...prev, {
                  id: currentMessageId,
                  role: 'assistant',
                  content: '',
                  created_at: new Date().toISOString()
                }])
              } else if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.text) {
                  accumulatedText += parsed.delta.text
                  setMessages(prev => prev.map(msg =>
                    msg.id === currentMessageId
                      ? { ...msg, content: accumulatedText }
                      : msg
                  ))
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      // Reload conversations to update the title (server auto-generates it)
      loadConversations()
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error)
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: 'Sorry, there was an error sending your message. Please try again.',
          created_at: new Date().toISOString()
        }])
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
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
        // Extract error details from response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const error = new Error(errorData.error || 'Failed to send message')
        error.status = response.status
        error.details = errorData.details
        throw error
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

  // Template functions
  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const openSaveAsTemplateModal = (conversationId) => {
    setSaveAsTemplateConversationId(conversationId)
    setShowSaveAsTemplateModal(true)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateCategory('General')
    closeContextMenu()
  }

  const closeSaveAsTemplateModal = () => {
    setShowSaveAsTemplateModal(false)
    setSaveAsTemplateConversationId(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateCategory('General')
  }

  const saveConversationAsTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: saveAsTemplateConversationId,
          name: templateName,
          description: templateDescription,
          category: templateCategory
        })
      })

      if (response.ok) {
        closeSaveAsTemplateModal()
        // Reload templates
        await loadTemplates()
        alert('Template saved successfully!')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    }
  }

  const openTemplatesModal = async () => {
    await loadTemplates()
    setShowTemplatesModal(true)
  }

  const closeTemplatesModal = () => {
    setShowTemplatesModal(false)
  }

  const createConversationFromTemplate = async (templateId) => {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const newConversation = await response.json()

        // Add the new conversation to the list
        setConversations([newConversation, ...conversations])

        // Switch to the new conversation
        setCurrentConversationId(newConversation.id)

        // Load messages for the new conversation
        const messagesResponse = await fetch(`${API_BASE}/conversations/${newConversation.id}/messages`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setMessages(messagesData)
        }

        closeTemplatesModal()
      }
    } catch (error) {
      console.error('Error creating conversation from template:', error)
      alert('Failed to create conversation from template')
    }
  }

  // Project Template functions
  const loadProjectTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/project-templates`)
      if (response.ok) {
        const data = await response.json()
        setProjectTemplates(data)
      }
    } catch (error) {
      console.error('Error loading project templates:', error)
    }
  }

  const openSaveAsProjectTemplateModal = (projectId) => {
    setSaveAsProjectTemplateId(projectId)
    setShowSaveAsProjectTemplateModal(true)
    setProjectTemplateName('')
    setProjectTemplateDescription('')
    setProjectTemplateCategory('General')
  }

  const closeSaveAsProjectTemplateModal = () => {
    setShowSaveAsProjectTemplateModal(false)
    setSaveAsProjectTemplateId(null)
    setProjectTemplateName('')
    setProjectTemplateDescription('')
    setProjectTemplateCategory('General')
  }

  const saveProjectAsTemplate = async () => {
    if (!projectTemplateName.trim()) {
      alert('Please enter a template name')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/project-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: saveAsProjectTemplateId,
          name: projectTemplateName,
          description: projectTemplateDescription,
          category: projectTemplateCategory
        })
      })

      if (response.ok) {
        closeSaveAsProjectTemplateModal()
        // Reload templates
        await loadProjectTemplates()
        alert('Project template saved successfully!')
      }
    } catch (error) {
      console.error('Error saving project template:', error)
      alert('Failed to save project template')
    }
  }

  const openProjectTemplatesModal = async () => {
    await loadProjectTemplates()
    setShowProjectTemplatesModal(true)
  }

  const closeProjectTemplatesModal = () => {
    setShowProjectTemplatesModal(false)
  }

  const createProjectFromTemplate = async (templateId) => {
    try {
      const response = await fetch(`${API_BASE}/project-templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const newProject = await response.json()

        // Reload projects
        await loadProjects()

        // Switch to the new project
        setCurrentProject(newProject.id)

        closeProjectTemplatesModal()
        alert('Project created from template!')
      }
    } catch (error) {
      console.error('Error creating project from template:', error)
      alert('Failed to create project from template')
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
    setExistingShares([])
    setRevokeConfirmToken(null)
    closeContextMenu()

    // Fetch existing shares first
    try {
      const sharesResponse = await fetch(`${API_BASE}/conversations/${conversationId}/shares`)
      if (sharesResponse.ok) {
        const shares = await sharesResponse.json()
        setExistingShares(shares)
      }
    } catch (error) {
      console.error('Error fetching existing shares:', error)
    }

    // Generate new share link
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        const fullUrl = `${window.location.origin}/share/${data.share_token}`
        setShareLink(fullUrl)

        // Refresh the shares list to include the new one
        const sharesResponse = await fetch(`${API_BASE}/conversations/${conversationId}/shares`)
        if (sharesResponse.ok) {
          const shares = await sharesResponse.json()
          setExistingShares(shares)
        }
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
    setExistingShares([])
    setRevokeConfirmToken(null)
  }

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    }
  }

  const revokeShare = async (token) => {
    try {
      const response = await fetch(`${API_BASE}/share/${token}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from existing shares list
        setExistingShares(existingShares.filter(share => share.share_token !== token))
        setRevokeConfirmToken(null)

        // If this was the current share link, clear it
        if (shareLink && shareLink.includes(token)) {
          setShareLink(null)
        }
      }
    } catch (error) {
      console.error('Error revoking share link:', error)
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

      // Fetch project analytics
      try {
        const analyticsResponse = await fetch(`${API_BASE}/projects/${projectId}/analytics`)
        const analytics = await analyticsResponse.json()
        setProjectAnalytics(analytics)
      } catch (analyticsError) {
        console.error('Error loading project analytics:', analyticsError)
        setProjectAnalytics(null)
      }

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
    setProjectAnalytics(null)
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

  // Sidebar resize handlers
  const handleResizeMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleResizeMouseMove = (e) => {
    if (!isResizing) return

    const newWidth = e.clientX
    // Constrain width between 200px and 500px
    if (newWidth >= 200 && newWidth <= 500) {
      setSidebarWidth(newWidth)
    }
  }

  const handleResizeMouseUp = () => {
    setIsResizing(false)
  }

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove)
      document.addEventListener('mouseup', handleResizeMouseUp)
      // Prevent text selection while dragging
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleResizeMouseMove)
      document.removeEventListener('mouseup', handleResizeMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMouseMove)
      document.removeEventListener('mouseup', handleResizeMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

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
    <div className={`${isDark ? 'dark' : ''} ${highContrast ? 'high-contrast' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
      <div className={`min-h-screen ${
        highContrast
          ? 'bg-white dark:bg-black text-black dark:text-white'
          : 'bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100'
      }`}>
        {/* Header */}
        <header className={`border-b px-4 py-3 ${
          highContrast
            ? 'border-black dark:border-white'
            : 'border-gray-200 dark:border-gray-800'
        }`}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Claude</h1>

            <div className="flex items-center gap-3">
              {/* Project Selector */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                    focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                    dark:focus:ring-offset-gray-900"
                  aria-label="Select project or folder"
                  aria-expanded={isProjectDropdownOpen}
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
                          transition-colors text-claude-orange font-medium text-sm"
                      >
                        + New Project
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          openProjectTemplatesModal()
                          setIsProjectDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                          transition-colors last:rounded-b-lg text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Project Templates
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
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                    focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                    dark:focus:ring-offset-gray-900"
                  aria-label="Select AI model"
                  aria-expanded={isModelDropdownOpen}
                >
                  <span className="text-sm font-medium">
                    {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
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
                          transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          selectedModel === model.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{model.name}</div>
                          {selectedModel === model.id && (
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {model.description}
                        </div>

                        {/* Context Window */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{model.contextWindow.toLocaleString()} tokens</span>
                        </div>

                        {/* Strengths */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {model.strengths.map((strength, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30
                              text-blue-700 dark:text-blue-300 text-xs rounded-full">
                              {strength}
                            </span>
                          ))}
                        </div>

                        {/* Pricing */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 dark:text-gray-500">Pricing (display only):</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3">
                            <span>Input: <span className="font-medium text-gray-700 dark:text-gray-300">{model.pricing.input}</span></span>
                            <span>Output: <span className="font-medium text-gray-700 dark:text-gray-300">{model.pricing.output}</span></span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{model.pricing.per}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Context Window Indicator */}
              {currentConversationId && (() => {
                const tokenCount = isNaN(contextWindowTokens) ? 0 : contextWindowTokens
                console.log('[Context Window Indicator] Rendering with tokens:', tokenCount)
                const currentModel = models.find(m => m.id === selectedModel)
                const contextLimit = currentModel?.contextWindow || 200000
                const percentage = (tokenCount / contextLimit) * 100
                const isWarning = percentage >= 80
                const isCritical = percentage >= 95

                return (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800/50" title={`${tokenCount.toLocaleString()} / ${contextLimit.toLocaleString()} tokens`}>
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          isCritical ? 'text-red-600 dark:text-red-400' :
                          isWarning ? 'text-orange-600 dark:text-orange-400' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {tokenCount.toLocaleString()} / {contextLimit.toLocaleString()}
                        </span>
                        {(isWarning || isCritical) && (
                          <svg className={`w-3 h-3 ${isCritical ? 'text-red-500' : 'text-orange-500'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="w-32 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCritical ? 'bg-red-500' :
                            isWarning ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Conversation Stats Button */}
              {currentConversationId && (
                <button
                  type="button"
                  onClick={() => loadConversationCost(currentConversationId)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                    focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                    dark:focus:ring-offset-gray-900"
                  title="View conversation stats and cost"
                  aria-label="View conversation statistics and cost"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Stats</span>
                </button>
              )}

              {/* Prompt Library Button */}
              <button
                type="button"
                onClick={() => {
                  loadPrompts()
                  setShowPromptLibrary(true)
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="Open prompt library"
                aria-label="Open prompt library"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <span className="text-sm">Prompts</span>
              </button>

              {/* Templates Button */}
              <button
                type="button"
                onClick={openTemplatesModal}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="Browse conversation templates"
                aria-label="Browse conversation templates"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span className="text-sm">Templates</span>
              </button>

              {/* Examples Button */}
              <button
                type="button"
                onClick={() => {
                  loadExampleConversations()
                  setShowExampleConversations(true)
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="Browse example conversations"
                aria-label="Browse example conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-sm">Examples</span>
              </button>

              {/* Tips Button */}
              <button
                type="button"
                onClick={openTipsModal}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="Browse quick tips and best practices"
                aria-label="Browse quick tips and best practices"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm">Tips</span>
              </button>

              {/* Usage Dashboard Button */}
              <button
                type="button"
                onClick={() => loadDailyUsage()}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="View daily usage and analytics"
                aria-label="View daily usage and analytics"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">Usage</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                  dark:focus:ring-offset-gray-900"
                title="Settings"
                aria-label="Open settings"
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
        <div className="flex h-[calc(100vh-60px)] relative">
          {/* Sidebar */}
          <aside
            className={`border-r ${
              highContrast
                ? 'border-black dark:border-white'
                : 'border-gray-200 dark:border-gray-800'
            } transition-all duration-300 ease-in-out overflow-hidden relative ${
              isSidebarCollapsed ? 'p-0' : 'p-4'
            }`}
            style={{ width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
            onContextMenu={handleSidebarContextMenu}
            role="navigation"
            aria-label="Conversation navigation"
          >
            {/* Resize Handle */}
            {!isSidebarCollapsed && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#CC785C] transition-colors z-20"
                onMouseDown={handleResizeMouseDown}
                title="Drag to resize sidebar"
              />
            )}
            <button
              type="button"
              onClick={createNewConversation}
              className="w-full bg-claude-orange hover:bg-claude-orange-hover text-white
                rounded-lg py-2.5 font-medium mb-4 transition-colors flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2
                dark:focus:ring-offset-gray-900"
              aria-label="Create new conversation"
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
                aria-label="Search conversations"
              />
            </div>

            {/* View Toggle */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
                  dark:focus:ring-offset-gray-900 ${
                  !showArchived
                    ? 'bg-claude-orange text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                aria-label="Show active conversations"
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
                  dark:focus:ring-offset-gray-900 ${
                  showArchived
                    ? 'bg-claude-orange text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                aria-label="Show archived conversations"
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setCurrentConversationId(conv.id)
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Open conversation: ${conv.title}`}
                          aria-current={conv.id === currentConversationId ? 'true' : 'false'}
                          className={`group relative px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                            cursor-pointer text-sm
                            focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
                            dark:focus:ring-offset-gray-900 ${
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
                              aria-label="Edit conversation title"
                            />
                          ) : (
                            <>
                              <div
                                onClick={(e) => startEditingConversation(conv, e)}
                                className="flex flex-col gap-1 truncate pr-6"
                              >
                                <div className="truncate">
                                  📌 {conv.title}
                                </div>
                                {conv.last_message_at && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatRelativeTime(conv.last_message_at)}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                                  focus:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity
                                  focus:outline-none focus:ring-2 focus:ring-claude-orange"
                                title="Delete conversation"
                                aria-label={`Delete conversation: ${conv.title}`}
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

                  {/* Regular Conversations - Grouped by Date */}
                  {(() => {
                    const filteredConversations = conversations.filter(c => {
                      const isInFolder = Object.values(folderConversations).some(convIds => convIds.includes(c.id))
                      return (showArchived ? c.is_archived : !c.is_archived) && !c.is_pinned && (currentProjectId === null || c.project_id === currentProjectId) && !isInFolder
                    })

                    if (filteredConversations.length === 0) return null

                    const dateGroups = groupConversationsByDate(filteredConversations)

                    const renderConversation = (conv) => (
                      <div
                        key={conv.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, conv.id)}
                        onClick={() => setCurrentConversationId(conv.id)}
                        onContextMenu={(e) => handleContextMenu(e, conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setCurrentConversationId(conv.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open conversation: ${conv.title}`}
                        aria-current={conv.id === currentConversationId ? 'true' : 'false'}
                        className={`group relative px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                          border border-gray-200 dark:border-gray-700 hover:shadow-sm
                          cursor-pointer text-sm
                          focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
                          dark:focus:ring-offset-gray-900 ${
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
                            aria-label="Edit conversation title"
                          />
                        ) : (
                          <>
                            <div
                              onClick={(e) => startEditingConversation(conv, e)}
                              className="flex flex-col gap-1 truncate pr-6"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {conv.has_unread ? (
                                  <span
                                    className="flex-shrink-0 w-2 h-2 bg-claude-orange rounded-full"
                                    aria-label="Unread messages"
                                    title="Unread messages"
                                  />
                                ) : null}
                                <span className="truncate">{conv.title}</span>
                              </div>
                              {conv.last_message_at && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatRelativeTime(conv.last_message_at)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => deleteConversation(conv.id, e)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                                focus:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity
                                focus:outline-none focus:ring-2 focus:ring-claude-orange"
                              title="Delete conversation"
                              aria-label={`Delete conversation: ${conv.title}`}
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
                    )

                    return (
                      <>
                        {dateGroups.today.length > 0 && (
                          <>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                              Today
                            </div>
                            {dateGroups.today.map(renderConversation)}
                          </>
                        )}

                        {dateGroups.yesterday.length > 0 && (
                          <>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mt-4">
                              Yesterday
                            </div>
                            {dateGroups.yesterday.map(renderConversation)}
                          </>
                        )}

                        {dateGroups.previous7Days.length > 0 && (
                          <>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mt-4">
                              Previous 7 days
                            </div>
                            {dateGroups.previous7Days.map(renderConversation)}
                          </>
                        )}

                        {dateGroups.previous30Days.length > 0 && (
                          <>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mt-4">
                              Previous 30 days
                            </div>
                            {dateGroups.previous30Days.map(renderConversation)}
                          </>
                        )}

                        {dateGroups.older.length > 0 && (
                          <>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mt-4">
                              Older
                            </div>
                            {dateGroups.older.map(renderConversation)}
                          </>
                        )}
                      </>
                    )
                  })()}
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
                                  border border-gray-200 dark:border-gray-700 hover:shadow-sm
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

            {/* User Profile Section */}
            {user && (
              <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
                    dark:focus:ring-offset-gray-900"
                  aria-label="User profile menu"
                  aria-expanded={showProfileMenu}
                >
                  {/* Avatar or Initials */}
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-claude-orange text-white flex items-center justify-center font-medium text-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  {/* User Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email || ''}
                    </div>
                  </div>
                  {/* Dropdown arrow */}
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setShowProfileModal(true)
                        setShowProfileMenu(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                        flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true)
                        setShowProfileMenu(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                        flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Sidebar Collapse Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute left-0 top-20 z-10 bg-white dark:bg-gray-800 border border-gray-200
              dark:border-gray-700 rounded-r-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700
              transition-all duration-300 ease-in-out shadow-sm
              focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-1
              dark:focus:ring-offset-gray-900"
            style={{ left: isSidebarCollapsed ? '0' : `${sidebarWidth}px` }}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isSidebarCollapsed}
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>

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
                  <div
                    className={`${messageDensity === 'compact' ? 'space-y-3' : messageDensity === 'spacious' ? 'space-y-8' : 'space-y-6'}`}
                    role="log"
                    aria-live="polite"
                    aria-label="Chat messages"
                  >
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
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeHighlight]}
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
                          {/* Response suggestions for assistant messages */}
                          {message.role === 'assistant' && !isStreaming && messageSuggestions[message.id] && messageSuggestions[message.id].length > 0 && (
                            <div className="mt-3 space-y-2">
                              {messageSuggestions[message.id] && messageSuggestions[message.id].length > 0 && (
                                <>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Suggested follow-ups:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {messageSuggestions[message.id].map((suggestion, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        disabled={isLoading}
                                        className="px-3 py-2 text-sm text-left
                                          border border-gray-300 dark:border-gray-600
                                          bg-white dark:bg-gray-800
                                          text-gray-700 dark:text-gray-300
                                          rounded-lg
                                          hover:bg-gray-50 dark:hover:bg-gray-700
                                          hover:border-[#CC785C] dark:hover:border-[#CC785C]
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                          transition-all duration-150
                                          max-w-md"
                                        title="Click to use this suggestion"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
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
                          {/* Token usage display */}
                          {message.id && !isStreaming && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleUsageExpanded(message.id)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs
                                  text-gray-500 dark:text-gray-400
                                  hover:text-gray-700 dark:hover:text-gray-300
                                  transition-colors"
                                title="View token usage"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                {expandedUsage.has(message.id) ? 'Hide' : 'Show'} token usage
                              </button>
                              {expandedUsage.has(message.id) && messageUsage[message.id] && (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Input tokens:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {messageUsage[message.id].input_tokens?.toLocaleString() || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Output tokens:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {messageUsage[message.id].output_tokens?.toLocaleString() || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Total tokens:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                      {messageUsage[message.id].total_tokens?.toLocaleString() || 0}
                                    </span>
                                  </div>
                                  {messageUsage[message.id].model && (
                                    <div className="flex justify-between text-gray-500 dark:text-gray-500 text-[10px] pt-1">
                                      <span>Model:</span>
                                      <span>{messageUsage[message.id].model}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && !isStreaming && (
                      <TypingIndicator />
                    )}
                    {/* Error Message Display */}
                    {errorMessage && (
                      <div className="flex justify-center mb-4">
                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                Error
                              </div>
                              <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                                {errorMessage}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={retryLastMessage}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md
                                    bg-red-600 text-white hover:bg-red-700
                                    transition-colors"
                                >
                                  Retry
                                </button>
                                <button
                                  onClick={() => {
                                    setErrorMessage(null)
                                    setLastFailedMessage(null)
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md
                                    border border-red-300 dark:border-red-700
                                    text-red-700 dark:text-red-300
                                    hover:bg-red-100 dark:hover:bg-red-900/30
                                    transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Related Prompts Section */}
                    {relatedPrompts.length > 0 && messages.length >= 2 && !isStreaming && (
                      <div className="mt-8 mb-6 max-w-3xl mx-auto">
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Related prompts you might find helpful:
                          </div>
                          <div className="space-y-2">
                            {relatedPrompts.map((prompt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleRelatedPromptClick(prompt)}
                                disabled={isLoading}
                                className="w-full text-left px-4 py-3 rounded-lg
                                  border border-gray-200 dark:border-gray-700
                                  bg-white dark:bg-gray-800
                                  text-gray-700 dark:text-gray-300
                                  hover:border-[#CC785C] hover:bg-orange-50 dark:hover:bg-orange-900/10
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-all duration-200
                                  text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-[#CC785C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>{prompt}</span>
                                </div>
                              </button>
                            ))}
                          </div>
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
                      placeholder:text-gray-400 dark:placeholder:text-gray-500
                      resize-none overflow-hidden"
                    style={{ minHeight: '52px' }}
                    disabled={isLoading}
                    aria-label="Message input"
                    aria-describedby="message-help-text"
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
                    aria-label="Attach image"
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
                      aria-label="Stop generating response"
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
                      aria-label="Send message"
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
                  <span id="message-help-text">Press Enter to send, Shift+Enter for new line</span>
                  <span className="font-medium" aria-live="polite" aria-atomic="true">{inputValue.length} characters</span>
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
                        } else if (currentArtifact.type === 'mermaid') {
                          extension = '.mmd';
                        } else if (currentArtifact.type === 'react') {
                          extension = '.jsx';
                        } else if (currentArtifact.type === 'text') {
                          extension = currentArtifact.language === 'markdown' || currentArtifact.language === 'md' ? '.md' : '.txt';
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
                ) : currentArtifact.type === 'mermaid' ? (
                  // Mermaid Diagram Preview
                  <div className="h-full bg-white dark:bg-gray-50 flex items-center justify-center p-4 overflow-auto">
                    <div
                      id={`mermaid-diagram-${currentArtifact.id}`}
                      className="mermaid-diagram"
                      key={currentArtifact.id}
                    >
                      {currentArtifact.content}
                    </div>
                  </div>
                ) : currentArtifact.type === 'react' ? (
                  // React Component Preview
                  <div className="h-full bg-white">
                    <iframe
                      srcDoc={`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${currentArtifact.content}

    // Auto-render the component if it's exported as default
    const componentMatch = ${JSON.stringify(currentArtifact.content)}.match(/export\\s+default\\s+function\\s+(\\w+)/);
    if (componentMatch) {
      const ComponentName = componentMatch[1];
      const element = React.createElement(eval(ComponentName));
      ReactDOM.render(element, document.getElementById('root'));
    } else {
      // Try to find any function component
      const funcMatch = ${JSON.stringify(currentArtifact.content)}.match(/function\\s+(\\w+)/);
      if (funcMatch) {
        const ComponentName = funcMatch[1];
        try {
          const element = React.createElement(eval(ComponentName));
          ReactDOM.render(element, document.getElementById('root'));
        } catch(e) {
          document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Error rendering component: ' + e.message + '</div>';
        }
      }
    }
  </script>
</body>
</html>
                      `}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts"
                      title="React Component Preview"
                    />
                  </div>
                ) : currentArtifact.type === 'text' ? (
                  // Text Document Preview
                  <div className="h-full bg-white dark:bg-gray-50 overflow-auto">
                    <div className="max-w-4xl mx-auto p-8">
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight]}
                        >
                          {currentArtifact.content}
                        </ReactMarkdown>
                      </div>
                    </div>
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
                openSaveAsTemplateModal(contextMenu.conversationId)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save as Template</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Share Conversation</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Anyone with this link can view this conversation (read-only).
              </p>

              {shareLink ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Latest Share Link</label>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 break-all text-sm">
                      {shareLink}
                    </div>
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

              {/* Existing Shares Section */}
              {existingShares.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Active Share Links ({existingShares.length})</h3>
                  <div className="space-y-3">
                    {existingShares.map((share) => (
                      <div key={share.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Created: {new Date(share.created_at).toLocaleDateString()} at {new Date(share.created_at).toLocaleTimeString()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 break-all">
                              {window.location.origin}/share/{share.share_token}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Views: {share.view_count || 0}
                            </div>
                          </div>
                          <button
                            onClick={() => setRevokeConfirmToken(share.share_token)}
                            className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white
                              rounded transition-colors whitespace-nowrap"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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

        {/* Revoke Confirmation Modal */}
        {revokeConfirmToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Revoke Share Link?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will permanently revoke access to this share link. Anyone with the link will no longer be able to view the conversation.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRevokeConfirmToken(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                    rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => revokeShare(revokeConfirmToken)}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white
                    rounded-lg transition-colors"
                >
                  Revoke Access
                </button>
              </div>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Project Settings</h2>
              <div className="space-y-6">
                {/* Analytics Section */}
                {projectAnalytics && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Usage Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-claude-orange">
                          {projectAnalytics.conversation_count}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Conversations
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-claude-orange">
                          {projectAnalytics.total_messages}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Total Messages
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-claude-orange">
                          {projectAnalytics.total_tokens?.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Total Tokens
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Instructions Section */}
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
                  onClick={() => {
                    closeProjectSettings()
                    openSaveAsProjectTemplateModal(editingProject)
                  }}
                  className="flex-1 px-4 py-2 border border-claude-orange
                    text-claude-orange rounded-lg hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Save as Template
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

        {/* Example Conversations Modal */}
        {showExampleConversations && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Example Conversations
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Start with a pre-made conversation and continue from there
                  </p>
                </div>
                <button
                  onClick={() => setShowExampleConversations(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exampleConversations.map((example) => (
                    <div
                      key={example.id}
                      className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg
                        hover:border-claude-orange hover:shadow-lg transition-all cursor-pointer
                        bg-white dark:bg-gray-800"
                      onClick={() => startExampleConversation(example)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-3xl">{example.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                            {example.title}
                          </h3>
                          <span className="inline-block px-2 py-1 text-xs rounded bg-claude-orange bg-opacity-10 text-claude-orange">
                            {example.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {example.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {example.messages.length} message{example.messages.length !== 1 ? 's' : ''} • Click to start
                      </div>
                    </div>
                  ))}
                </div>

                {exampleConversations.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p>No example conversations available</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => setShowExampleConversations(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tips Modal */}
        {showTipsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-7 h-7 text-claude-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Quick Tips & Best Practices
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Actionable tips to get the most out of Claude
                  </p>
                </div>
                <button
                  onClick={closeTipsModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Filter */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {getTipCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedTipCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${selectedTipCategory === category
                          ? 'bg-claude-orange text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {getFilteredTips().map((tip) => {
                    const isRead = readTips.includes(tip.id)
                    return (
                      <div
                        key={tip.id}
                        className={`p-5 border rounded-lg transition-all
                          ${isRead
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-claude-orange hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                {tip.title}
                              </h3>
                              {isRead && (
                                <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                  ✓ Read
                                </span>
                              )}
                            </div>
                            <span className="inline-block px-2 py-1 text-xs rounded bg-claude-orange bg-opacity-10 text-claude-orange mb-3">
                              {tip.category}
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                              {tip.content}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                💡 {tip.actionable}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!isRead && (
                              <button
                                onClick={() => markTipAsRead(tip.id)}
                                className="px-3 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                title="Mark as read"
                              >
                                Mark Read
                              </button>
                            )}
                            <button
                              onClick={() => dismissTip(tip.id)}
                              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Dismiss tip"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {getFilteredTips().length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p>No tips in this category</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {readTips.length} of {tips.length} tips marked as read
                </div>
                <button
                  onClick={closeTipsModal}
                  className="px-6 py-2 bg-claude-orange hover:bg-claude-orange-dark text-white rounded-lg
                    transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Command Palette Modal */}
        {showCommandPalette && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={commandPaletteQuery}
                    onChange={(e) => setCommandPaletteQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Execute the first filtered command
                        const filteredCommands = commands.filter(cmd => {
                          const query = commandPaletteQuery.toLowerCase()
                          return cmd.name.toLowerCase().includes(query) ||
                                 cmd.description.toLowerCase().includes(query)
                        })
                        if (filteredCommands.length > 0) {
                          filteredCommands[0].action()
                        }
                      }
                    }}
                    placeholder="Type a command or search..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none
                      text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none rounded-lg"
                    autoFocus
                  />
                </div>
              </div>

              {/* Commands List */}
              <div className="max-h-96 overflow-y-auto">
                {commands
                  .filter(cmd => {
                    const query = commandPaletteQuery.toLowerCase()
                    return cmd.name.toLowerCase().includes(query) ||
                           cmd.description.toLowerCase().includes(query)
                  })
                  .map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800
                        transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <span className="text-2xl">{cmd.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {cmd.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {cmd.description}
                        </div>
                      </div>
                    </button>
                  ))}

                {commands.filter(cmd => {
                  const query = commandPaletteQuery.toLowerCase()
                  return cmd.name.toLowerCase().includes(query) ||
                         cmd.description.toLowerCase().includes(query)
                }).length === 0 && (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>No commands found</p>
                  </div>
                )}
              </div>

              {/* Footer Hint */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700
                text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Press <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">Esc</kbd> to close</span>
                <span>Use <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">⌘K</kbd> or <kbd className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">Ctrl+K</kbd> to open</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div ref={settingsModalRef} className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

              {/* Code Theme Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Code Theme</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose syntax highlighting theme for code blocks
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCodeTheme('github-dark')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'github-dark'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">GitHub Dark</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Popular dark theme</div>
                    {codeTheme === 'github-dark' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setCodeTheme('vs2015')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'vs2015'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">VS Code Dark</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">VS Code style</div>
                    {codeTheme === 'vs2015' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setCodeTheme('monokai')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'monokai'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Monokai</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vibrant colors</div>
                    {codeTheme === 'monokai' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setCodeTheme('atom-one-dark')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'atom-one-dark'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Atom One Dark</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Atom editor</div>
                    {codeTheme === 'atom-one-dark' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setCodeTheme('github')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'github'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">GitHub Light</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Light theme</div>
                    {codeTheme === 'github' && (
                      <div className="text-claude-orange text-xs mt-1">✓</div>
                    )}
                  </button>
                  <button
                    onClick={() => setCodeTheme('tomorrow-night-blue')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      codeTheme === 'tomorrow-night-blue'
                        ? 'border-claude-orange bg-claude-orange/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">Tomorrow Night</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Blue tones</div>
                    {codeTheme === 'tomorrow-night-blue' && (
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

              {/* Accessibility Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Accessibility</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Options to improve accessibility
                </p>

                {/* High Contrast Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                  <div className="flex-1">
                    <div className="font-medium">High Contrast Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Increase color contrast for better readability
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHighContrast(!highContrast)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 ${
                      highContrast ? 'bg-claude-orange' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={highContrast}
                    aria-label="Toggle high contrast mode"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        highContrast ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="font-medium">Reduced Motion</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Minimize animations for those sensitive to motion
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 ${
                      reducedMotion ? 'bg-claude-orange' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={reducedMotion}
                    aria-label="Toggle reduced motion"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        reducedMotion ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Language Preferences Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Language Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose your preferred language for the interface
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { code: 'en', name: 'English', flag: '🇺🇸' },
                    { code: 'es', name: 'Español', flag: '🇪🇸' },
                    { code: 'fr', name: 'Français', flag: '🇫🇷' },
                    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
                    { code: 'pt', name: 'Português', flag: '🇵🇹' },
                    { code: 'ja', name: '日本語', flag: '🇯🇵' },
                    { code: 'zh', name: '中文', flag: '🇨🇳' },
                    { code: 'ko', name: '한국어', flag: '🇰🇷' },
                    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        language === lang.code
                          ? 'border-claude-orange bg-claude-orange/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{lang.flag}</span>
                          <span className="font-medium">{lang.name}</span>
                        </div>
                        {language === lang.code && (
                          <span className="text-claude-orange">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Note: Currently only English is fully supported. Other languages are planned for future releases.
                </p>
              </div>

              {/* API Keys Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">API Keys</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Manage your Anthropic API keys
                </p>

                {/* Add API Key Button */}
                <button
                  onClick={() => setShowAddApiKeyModal(true)}
                  className="mb-4 px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add API Key
                </button>

                {/* API Keys List */}
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-sm">No API keys added yet</p>
                    <p className="text-xs mt-1">Add an API key to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{key.key_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                            {key.api_key_masked}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Added {new Date(key.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete API key"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Export Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Data Export</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Download all your conversations, settings, and data
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE}/export/full-data`);
                      if (!response.ok) throw new Error('Export failed');

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `claude-data-export-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export data. Please try again.');
                    }
                  }}
                  className="w-full px-4 py-3 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Full Account Data
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Exports all conversations, messages, projects, folders, artifacts, and settings in JSON format
                </p>
              </div>

              {/* Privacy Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Privacy</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Control how your conversation data is stored
                </p>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex-1">
                      <div className="font-medium mb-1">Save Conversation History</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        When enabled, your conversations are saved in your account. When disabled, conversations won't be stored after you close or refresh the page.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !saveConversationHistory;
                        setSaveConversationHistory(newValue);
                        if (!newValue) {
                          // Show confirmation message
                          if (confirm('Disabling conversation history means new conversations will not be saved to your account. Existing conversations will remain. Continue?')) {
                            // Confirmed
                          } else {
                            // Cancelled, revert
                            setSaveConversationHistory(true);
                          }
                        }
                      }}
                      className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange focus:ring-offset-2 ${
                        saveConversationHistory
                          ? 'bg-claude-orange'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label="Toggle conversation history"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          saveConversationHistory ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {!saveConversationHistory && (
                    <div className="px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex gap-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                          <strong>Note:</strong> New conversations will not be saved when this setting is disabled. Existing conversations in your history will remain unaffected.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcutsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Keyboard Shortcuts</h2>
                <button
                  onClick={() => setShowKeyboardShortcutsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* General Shortcuts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">General</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Open command palette</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Cmd/Ctrl + K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Close modal or palette</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">View keyboard shortcuts</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      ?
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Conversation Shortcuts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Conversations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Navigate to previous conversation</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Cmd/Ctrl + ↑
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Navigate to next conversation</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Cmd/Ctrl + ↓
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Message Shortcuts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Messages</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Send message</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">New line in message</span>
                    <kbd className="px-2 py-1 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                      Shift + Enter
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Quick Actions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">New conversation</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Via command palette (Cmd/Ctrl + K → "New")</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Search conversations</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Via command palette (Cmd/Ctrl + K → "Search")</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300">Toggle theme</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Via command palette (Cmd/Ctrl + K → "Toggle")</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowKeyboardShortcutsModal(false)}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Edit Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Edit Profile</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={editedUserName}
                    onChange={(e) => setEditedUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={editedUserEmail}
                    onChange={(e) => setEditedUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Avatar URL Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Avatar URL</label>
                  <input
                    type="text"
                    value={editedUserAvatar}
                    onChange={(e) => setEditedUserAvatar(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter a URL to an image, or leave blank to use initials
                  </p>
                </div>

                {/* Avatar Preview */}
                {editedUserAvatar && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Avatar Preview</label>
                    <div className="flex items-center gap-3">
                      <img
                        src={editedUserAvatar}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        If the image doesn't load, check the URL
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                    rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add API Key Modal */}
        {showAddApiKeyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Add API Key</h2>

              <div className="space-y-4 mb-6">
                {/* Key Name Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Key Name</label>
                  <input
                    type="text"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    placeholder="e.g., My Personal Key"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Give your API key a memorable name
                  </p>
                </div>

                {/* API Key Value Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <input
                    type="password"
                    value={newApiKeyValue}
                    onChange={(e) => setNewApiKeyValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono
                      focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    placeholder="sk-ant-..."
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your Anthropic API key starting with sk-ant-
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddApiKeyModal(false)
                    setNewApiKeyName('')
                    setNewApiKeyValue('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addApiKey}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Add Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conversation Cost Modal */}
        {showConversationCost && conversationCostData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Conversation Statistics</h2>
                <button
                  onClick={() => setShowConversationCost(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Total Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Total Usage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</p>
                    <p className="text-2xl font-bold">{conversationCostData.total_input_tokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</p>
                    <p className="text-2xl font-bold">{conversationCostData.total_output_tokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</p>
                    <p className="text-2xl font-bold">{conversationCostData.total_tokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
                    <p className="text-2xl font-bold text-claude-orange">
                      ${conversationCostData.total_cost.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Breakdown */}
              {conversationCostData.model_breakdown && conversationCostData.model_breakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Breakdown by Model</h3>
                  <div className="space-y-4">
                    {conversationCostData.model_breakdown.map((modelData, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">
                            {models.find(m => m.id === modelData.model)?.name || modelData.model}
                          </h4>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {modelData.message_count} {modelData.message_count === 1 ? 'message' : 'messages'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Input</p>
                            <p className="font-semibold">{modelData.input_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.input_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Output</p>
                            <p className="font-semibold">{modelData.output_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.output_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total</p>
                            <p className="font-semibold">{modelData.total_tokens.toLocaleString()}</p>
                            <p className="text-xs text-claude-orange font-medium">${modelData.total_cost.toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowConversationCost(false)}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Dashboard Modal */}
        {showUsageDashboard && (dailyUsageData || monthlyUsageData) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Usage Dashboard</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {usageView === 'daily' && dailyUsageData && `Daily view - ${new Date(dailyUsageData.date).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}`}
                    {usageView === 'monthly' && monthlyUsageData && `Monthly view - ${monthlyUsageData.month_name}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowUsageDashboard(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    if (!dailyUsageData) loadDailyUsage()
                    else setUsageView('daily')
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    usageView === 'daily'
                      ? 'bg-claude-orange text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => {
                    if (!monthlyUsageData) loadMonthlyUsage()
                    else setUsageView('monthly')
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    usageView === 'monthly'
                      ? 'bg-claude-orange text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Monthly
                </button>
              </div>

              {/* Summary Section */}
              {usageView === 'daily' && dailyUsageData && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Today's Usage</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</p>
                      <p className="text-2xl font-bold">{dailyUsageData.total_input_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</p>
                      <p className="text-2xl font-bold">{dailyUsageData.total_output_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</p>
                      <p className="text-2xl font-bold">{dailyUsageData.total_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
                      <p className="text-2xl font-bold text-claude-orange">
                        ${dailyUsageData.total_cost.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {usageView === 'monthly' && monthlyUsageData && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">This Month's Usage</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</p>
                      <p className="text-2xl font-bold">{monthlyUsageData.total_input_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</p>
                      <p className="text-2xl font-bold">{monthlyUsageData.total_output_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</p>
                      <p className="text-2xl font-bold">{monthlyUsageData.total_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
                      <p className="text-2xl font-bold text-claude-orange">
                        ${monthlyUsageData.total_cost.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily View: 7-Day History Chart */}
              {usageView === 'daily' && dailyUsageData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Last 7 Days</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="space-y-3">
                      {dailyUsageData.history && dailyUsageData.history.map((day, index) => {
                        const maxTokens = Math.max(...dailyUsageData.history.map(d => d.total_tokens), 1);
                        const percentage = (day.total_tokens / maxTokens) * 100;
                        const isToday = day.date === dailyUsageData.date;

                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {isToday && <span className="ml-1 text-claude-orange">•</span>}
                            </div>
                            <div className="flex-1">
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                <div
                                  className={`h-full ${isToday ? 'bg-claude-orange' : 'bg-blue-500'} transition-all duration-300 flex items-center px-2`}
                                  style={{ width: `${Math.max(percentage, 2)}%` }}
                                >
                                  {day.total_tokens > 0 && (
                                    <span className="text-xs text-white font-medium">
                                      {day.total_tokens.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                              {day.conversation_count} conv{day.conversation_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                      Total tokens per day (orange = today)
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly View: Daily Breakdown Chart */}
              {usageView === 'monthly' && monthlyUsageData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Breakdown</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {monthlyUsageData.daily_breakdown && monthlyUsageData.daily_breakdown.map((day, index) => {
                        const maxTokens = Math.max(...monthlyUsageData.daily_breakdown.map(d => d.total_tokens), 1);
                        const percentage = (day.total_tokens / maxTokens) * 100;
                        const today = new Date().toISOString().split('T')[0];
                        const isToday = day.date === today;

                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-20 text-xs text-gray-600 dark:text-gray-400">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {isToday && <span className="ml-1 text-claude-orange">•</span>}
                            </div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                <div
                                  className={`h-full ${isToday ? 'bg-claude-orange' : 'bg-blue-500'} transition-all duration-300 flex items-center px-2`}
                                  style={{ width: `${Math.max(percentage, 2)}%` }}
                                >
                                  {day.total_tokens > 0 && (
                                    <span className="text-xs text-white font-medium">
                                      {day.total_tokens.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right">
                              {day.conversation_count} conv{day.conversation_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                      Total tokens per day (orange = today)
                    </div>
                  </div>
                </div>
              )}

              {/* Model Breakdown */}
              {usageView === 'daily' && dailyUsageData && dailyUsageData.model_breakdown && dailyUsageData.model_breakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Breakdown by Model</h3>
                  <div className="space-y-4">
                    {dailyUsageData.model_breakdown.map((modelData, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">
                            {models.find(m => m.id === modelData.model)?.name || modelData.model}
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span>{modelData.message_count} {modelData.message_count === 1 ? 'message' : 'messages'}</span>
                            <span className="mx-2">•</span>
                            <span>{modelData.conversation_count} {modelData.conversation_count === 1 ? 'conversation' : 'conversations'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Input</p>
                            <p className="font-semibold">{modelData.input_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.input_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Output</p>
                            <p className="font-semibold">{modelData.output_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.output_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total</p>
                            <p className="font-semibold">{modelData.total_tokens.toLocaleString()}</p>
                            <p className="text-xs text-claude-orange font-medium">${modelData.total_cost.toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usageView === 'monthly' && monthlyUsageData && monthlyUsageData.model_breakdown && monthlyUsageData.model_breakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Breakdown by Model</h3>
                  <div className="space-y-4">
                    {monthlyUsageData.model_breakdown.map((modelData, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">
                            {models.find(m => m.id === modelData.model)?.name || modelData.model}
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span>{modelData.message_count} {modelData.message_count === 1 ? 'message' : 'messages'}</span>
                            <span className="mx-2">•</span>
                            <span>{modelData.conversation_count} {modelData.conversation_count === 1 ? 'conversation' : 'conversations'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Input</p>
                            <p className="font-semibold">{modelData.input_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.input_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Output</p>
                            <p className="font-semibold">{modelData.output_tokens.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">${modelData.output_cost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total</p>
                            <p className="font-semibold">{modelData.total_tokens.toLocaleString()}</p>
                            <p className="text-xs text-claude-orange font-medium">${modelData.total_cost.toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowUsageDashboard(false)}
                  className="px-4 py-2 bg-claude-orange hover:bg-claude-orange-hover
                    text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Library Modal */}
        {showPromptLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Prompt Library
                </h2>
                <button
                  onClick={() => setShowPromptLibrary(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Create New Prompt Section */}
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Create New Prompt
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={newPromptTitle}
                        onChange={(e) => setNewPromptTitle(e.target.value)}
                        placeholder="e.g., Code Reviewer"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newPromptDescription}
                        onChange={(e) => setNewPromptDescription(e.target.value)}
                        placeholder="Brief description of what this prompt does"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prompt Template *
                      </label>
                      <textarea
                        value={newPromptTemplate}
                        onChange={(e) => setNewPromptTemplate(e.target.value)}
                        placeholder="Enter your prompt template here..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-claude-orange focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <select
                          value={newPromptCategory}
                          onChange={(e) => setNewPromptCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                        >
                          <option value="General">General</option>
                          <option value="Coding">Coding</option>
                          <option value="Writing">Writing</option>
                          <option value="Analysis">Analysis</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={newPromptTags}
                          onChange={(e) => setNewPromptTags(e.target.value)}
                          placeholder="code, review, best-practices"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                        />
                      </div>
                    </div>

                    <button
                      onClick={createPrompt}
                      className="w-full bg-claude-orange hover:bg-claude-orange-hover text-white
                        font-medium py-2.5 rounded-lg transition-colors"
                    >
                      Save Prompt
                    </button>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-4 flex gap-2 flex-wrap">
                  {promptCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-claude-orange text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Prompts List */}
                <div className="space-y-3">
                  {prompts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <p className="text-lg">No prompts yet</p>
                      <p className="text-sm">Create your first prompt above to get started</p>
                    </div>
                  ) : (
                    prompts
                      .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
                      .map(prompt => (
                        <div
                          key={prompt.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                            hover:border-claude-orange hover:shadow-md transition-all cursor-pointer"
                          onClick={() => usePrompt(prompt)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {prompt.title}
                              </h4>
                              {prompt.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {prompt.description}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {prompt.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                            {prompt.prompt_template}
                          </p>
                          {prompt.tags && prompt.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {prompt.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 rounded bg-claude-orange bg-opacity-10 text-claude-orange"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => setShowPromptLibrary(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save as Project Template Modal */}
        {showSaveAsProjectTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Save Project as Template
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={projectTemplateName}
                      onChange={(e) => setProjectTemplateName(e.target.value)}
                      placeholder="e.g., Python Data Analysis Project"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={projectTemplateDescription}
                      onChange={(e) => setProjectTemplateDescription(e.target.value)}
                      placeholder="Brief description of this project template..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={projectTemplateCategory}
                      onChange={(e) => setProjectTemplateCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    >
                      <option value="General">General</option>
                      <option value="Development">Development</option>
                      <option value="Research">Research</option>
                      <option value="Writing">Writing</option>
                      <option value="Design">Design</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={closeSaveAsProjectTemplateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProjectAsTemplate}
                    className="flex-1 bg-claude-orange hover:bg-claude-orange-hover text-white
                      font-medium py-2 rounded-lg transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Templates Modal */}
        {showProjectTemplatesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Project Templates
                </h2>
                <button
                  onClick={closeProjectTemplatesModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {projectTemplates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-lg">No project templates yet</p>
                    <p className="text-sm mt-2">Open a project settings and click "Save as Template" to create one</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectTemplates.map(template => (
                      <div
                        key={template.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                          hover:border-claude-orange dark:hover:border-claude-orange transition-colors cursor-pointer
                          bg-gray-50 dark:bg-gray-800"
                        onClick={() => createProjectFromTemplate(template.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                            {template.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded bg-claude-orange bg-opacity-10 text-claude-orange">
                            {template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Project: {template.template_structure?.name || 'Untitled'}</span>
                          <span>Used {template.usage_count} times</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={closeProjectTemplatesModal}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save as Template Modal */}
        {showSaveAsTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Save as Template
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Code Review Template"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of this template..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-claude-orange focus:border-transparent"
                    >
                      <option value="General">General</option>
                      <option value="Coding">Coding</option>
                      <option value="Writing">Writing</option>
                      <option value="Analysis">Analysis</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={closeSaveAsTemplateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveConversationAsTemplate}
                    className="flex-1 bg-claude-orange hover:bg-claude-orange-hover text-white
                      font-medium py-2 rounded-lg transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplatesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Conversation Templates
                </h2>
                <button
                  onClick={closeTemplatesModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <p className="text-lg">No templates yet</p>
                    <p className="text-sm mt-2">Right-click on a conversation and select "Save as Template" to create one</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                          hover:border-claude-orange dark:hover:border-claude-orange transition-colors cursor-pointer
                          bg-gray-50 dark:bg-gray-800"
                        onClick={() => createConversationFromTemplate(template.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                            {template.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded bg-claude-orange bg-opacity-10 text-claude-orange">
                            {template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{template.template_structure?.messages?.length || 0} messages</span>
                          <span>Used {template.usage_count} times</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={closeTemplatesModal}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Tour */}
        {showOnboardingTour && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
              {/* Tour Progress Bar */}
              <div className="h-1 bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full bg-claude-orange transition-all duration-300"
                  style={{ width: `${((tourStep + 1) / 6) * 100}%` }}
                ></div>
              </div>

              {/* Tour Content */}
              <div className="p-8">
                {/* Step 0: Welcome */}
                {tourStep === 0 && (
                  <div className="text-center">
                    <div className="mb-6">
                      <div className="w-20 h-20 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-4xl">👋</span>
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Welcome to Claude
                      </h2>
                      <p className="text-lg text-gray-600 dark:text-gray-400">
                        Let's take a quick tour to help you get started with Claude's powerful features.
                      </p>
                    </div>
                    <div className="space-y-3 text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">💬</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Natural Conversations</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Have multi-turn conversations with Claude</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📁</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Organize Your Work</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Manage conversations and projects easily</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚙️</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Customize Everything</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Adjust settings to match your preferences</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Chat Interface */}
                {tourStep === 1 && (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl">💬</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Chat Interface
                      </h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-400">
                      <p>
                        The main chat area is where you'll interact with Claude. Simply type your message
                        in the input field at the bottom and press Enter to send.
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm">Enter</kbd>
                          <span className="text-sm">Send message</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm">Shift</kbd>
                          <span className="text-sm">+</span>
                          <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm">Enter</kbd>
                          <span className="text-sm">New line</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Conversations */}
                {tourStep === 2 && (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl">📝</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Conversation Management
                      </h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-400">
                      <p>
                        Your conversations are saved in the left sidebar, grouped by date. You can:
                      </p>
                      <ul className="space-y-2 list-none">
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">✓</span>
                          <span>Create new conversations with the "+ New Chat" button</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">✓</span>
                          <span>Rename conversations by clicking on their titles</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">✓</span>
                          <span>Search conversations using the search bar</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">✓</span>
                          <span>Archive or delete conversations from the context menu</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Step 3: Model Selection */}
                {tourStep === 3 && (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl">🤖</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Choose Your Model
                      </h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-400">
                      <p>
                        You can select different Claude models based on your needs. Find the model
                        selector in the top navigation bar.
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Claude Sonnet 4.5</h4>
                          <p className="text-sm">Best for most tasks - balanced performance</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Claude Haiku 4.5</h4>
                          <p className="text-sm">Fastest responses for quick tasks</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Claude Opus 4.1</h4>
                          <p className="text-sm">Most capable for complex reasoning</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Features */}
                {tourStep === 4 && (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl">✨</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Powerful Features
                      </h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-400">
                      <p>
                        Explore these powerful features to enhance your experience:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="text-xl mb-1">📊</div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Prompts</h4>
                          <p className="text-xs">Browse pre-made prompt templates</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="text-xl mb-1">📋</div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Templates</h4>
                          <p className="text-xs">Use project templates</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="text-xl mb-1">💡</div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Examples</h4>
                          <p className="text-xs">See example conversations</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="text-xl mb-1">📈</div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Usage</h4>
                          <p className="text-xs">Track your API usage</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Settings */}
                {tourStep === 5 && (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-claude-orange/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl">⚙️</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        Customize Your Experience
                      </h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-400">
                      <p>
                        Click the Settings button in the top right to customize:
                      </p>
                      <ul className="space-y-2 list-none">
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">•</span>
                          <span><strong className="text-gray-900 dark:text-gray-100">Theme:</strong> Light, dark, or auto mode</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">•</span>
                          <span><strong className="text-gray-900 dark:text-gray-100">Font Size:</strong> Adjust text size for readability</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">•</span>
                          <span><strong className="text-gray-900 dark:text-gray-100">Language:</strong> Choose your preferred language</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-claude-orange">•</span>
                          <span><strong className="text-gray-900 dark:text-gray-100">Privacy:</strong> Manage conversation history</span>
                        </li>
                      </ul>
                      <div className="bg-claude-orange/10 border border-claude-orange/20 rounded-lg p-4 mt-6">
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          🎉 You're all set! Start chatting with Claude and explore all the features.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tour Navigation */}
              <div className="px-8 pb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((step) => (
                    <button
                      key={step}
                      onClick={() => setTourStep(step)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        step === tourStep
                          ? 'bg-claude-orange w-6'
                          : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                      }`}
                      aria-label={`Go to step ${step + 1}`}
                    ></button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      localStorage.setItem('onboardingCompleted', 'true')
                      setShowOnboardingTour(false)
                      setTourStep(0)
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    Skip Tour
                  </button>

                  {tourStep > 0 && (
                    <button
                      onClick={() => setTourStep(tourStep - 1)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      Back
                    </button>
                  )}

                  {tourStep < 5 ? (
                    <button
                      onClick={() => setTourStep(tourStep + 1)}
                      className="px-6 py-2 bg-claude-orange hover:bg-claude-orange-dark text-white rounded-lg
                        transition-colors font-medium"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        localStorage.setItem('onboardingCompleted', 'true')
                        setShowOnboardingTour(false)
                        setTourStep(0)
                      }}
                      className="px-6 py-2 bg-claude-orange hover:bg-claude-orange-dark text-white rounded-lg
                        transition-colors font-medium"
                    >
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
