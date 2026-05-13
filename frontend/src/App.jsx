import { useState } from 'react'

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message immediately
    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      setMessages([...newMessages, { role: 'ai', content: data.reply }])
    } catch (error) {
      console.error('Error:', error)
      setMessages([...newMessages, { role: 'ai', content: 'Error connecting to backend.' }])
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <h1 className="text-xl font-medium tracking-tight">CareerOS<span className="text-muted-foreground ml-2 text-sm font-normal">Phase 1</span></h1>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>Type a message to test the connection...</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-muted text-foreground rounded-br-sm'
                    : 'bg-transparent border border-border text-foreground rounded-bl-sm'
                }`}
              >
                <p className="text-[15px] leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-background border-t border-border">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            className="w-full bg-muted/50 border border-border rounded-full py-3 px-6 pr-12 focus:outline-none focus:ring-1 focus:ring-muted-foreground transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
            disabled={!input.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </footer>
    </div>
  )
}

export default App
