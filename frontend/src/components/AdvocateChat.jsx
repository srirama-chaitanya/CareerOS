import { useState } from 'react'

export default function AdvocateChat() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* The Chat Window */}
      <div className={`transition-all duration-300 ease-in-out transform origin-bottom-right mb-4 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
        <div className="w-80 bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="bg-blue-500/10 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">The Advocate</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div className="p-4 h-64 overflow-y-auto flex flex-col space-y-3">
            <div className="bg-white/5 p-3 rounded-lg rounded-tl-none self-start max-w-[90%] border border-white/5 shadow-sm">
              <p className="text-sm text-white/80">
                Standing by. Upload your resume to the Engine Room to initialize my RAG context.
              </p>
            </div>
          </div>
          <div className="p-3 border-t border-white/10 bg-black/40">
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              className="w-full bg-transparent border-none text-sm text-white placeholder-white/30 focus:outline-none focus:ring-0 px-2"
            />
          </div>
        </div>
      </div>

      {/* The Circular Toggle Button (FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30 transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <path d="M8 10h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M16 10h.01"></path>
          </svg>
        )}
      </button>

    </div>
  )
}
