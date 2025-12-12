import { useState } from 'react'

function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Claude</h1>
            <button
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-60px)]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
            <button className="w-full bg-claude-orange hover:bg-claude-orange-hover text-white
              rounded-lg py-2.5 font-medium mb-4 transition-colors">
              New Chat
            </button>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                Today
              </div>
              <div className="px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                cursor-pointer text-sm">
                Welcome to Claude
              </div>
            </div>
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-semibold mb-3">
                    Welcome to Claude
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Start a conversation to begin
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {[
                    'Help me write a professional email',
                    'Explain a complex topic simply',
                    'Debug my code',
                    'Brainstorm creative ideas'
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700
                        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-sm">{prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <textarea
                    placeholder="Message Claude..."
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300
                      dark:border-gray-700 bg-white dark:bg-gray-900
                      focus:outline-none focus:ring-2 focus:ring-claude-orange
                      resize-none"
                    rows="2"
                  />
                  <button
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-claude-orange
                      hover:bg-claude-orange-hover text-white transition-colors"
                  >
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
