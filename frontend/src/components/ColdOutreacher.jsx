import { useState, useRef, useEffect } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'

function ColdOutreacherContent() {
  const [targetContext, setTargetContext] = useState('')
  const [draft, setDraft] = useState('')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedTone, setSelectedTone] = useState('') // empty string is default/standard
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })
  
  const textareaRef = useRef(null)

  // Auto-resize the draft textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [draft])

  const handleDraft = async (modifier = '') => {
    if (!targetContext.trim()) {
      setStatusMsg({ text: 'Please provide a Job Description or LinkedIn target first.', type: 'error' })
      return
    }

    setIsDrafting(true)
    setStatusMsg({ text: 'LangGraph is querying ChromaDB and drafting pitch...', type: 'info' })
    
    // If a modifier is passed directly (from quick actions), use that. Otherwise use the selectedTone state.
    const activeModifier = modifier || selectedTone

    try {
      const res = await fetch('http://localhost:8000/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: targetContext,
          modifier: activeModifier
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSubject(data.subject || '')
        setDraft(data.body || '')
        setStatusMsg({ text: 'Draft generated successfully.', type: 'success' })
      } else {
        setStatusMsg({ text: data.detail || 'Failed to generate draft.', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      setStatusMsg({ text: 'Network error communicating with LangGraph.', type: 'error' })
    } finally {
      setIsDrafting(false)
    }
  }

  const executeSend = async (token) => {
    if (!recipient || !subject || !draft) {
      setStatusMsg({ text: 'Recipient, Subject, and Draft body are required to send.', type: 'error' })
      return
    }

    setIsSending(true)
    setStatusMsg({ text: 'Dispatching via Gmail API...', type: 'info' })

    try {
      const res = await fetch('http://localhost:8000/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipient,
          subject: subject,
          body: draft,
          access_token: token
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        setStatusMsg({ text: `Email dispatched successfully! Message ID: ${data.message_id}`, type: 'success' })
      } else {
        setStatusMsg({ text: data.detail || 'Failed to send email.', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      setStatusMsg({ text: 'Network error communicating with Gmail API.', type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  const loginAndSend = useGoogleLogin({
    onSuccess: (tokenResponse) => executeSend(tokenResponse.access_token),
    onError: () => setStatusMsg({ text: 'OAuth Login Failed. Cannot send email.', type: 'error' }),
    scope: 'https://www.googleapis.com/auth/gmail.send',
    prompt: 'consent'
  })

  return (
    <div className="max-w-6xl mx-auto py-12 px-8">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">The Cold Outreacher</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Deploy the Pitch Agent. It scans the job description, pulls your deepest technical feats from ChromaDB, and drafts a hyper-targeted cold email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Target Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-colors duration-500 pointer-events-none"></div>
            
            <h3 className="text-white/70 font-medium mb-4 text-sm uppercase tracking-wider">Target Context</h3>
            
            <textarea
              value={targetContext}
              onChange={(e) => setTargetContext(e.target.value)}
              placeholder="Paste the Job Description or Hiring Manager's LinkedIn bio here..."
              className="w-full h-64 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors resize-none mb-6 relative z-10"
            />

            <h4 className="text-white/50 text-xs mb-3 uppercase tracking-wider relative z-10">Select Initial Tone</h4>
            <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
              <button
                onClick={() => setSelectedTone('')}
                className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                  selectedTone === ''
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setSelectedTone('shorter')}
                className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                  selectedTone === 'shorter'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Shorter
              </button>
              <button
                onClick={() => setSelectedTone('more_technical')}
                className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                  selectedTone === 'more_technical'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Highly Technical
              </button>
            </div>

            <button
              onClick={() => handleDraft()}
              disabled={isDrafting}
              className={`w-full py-4 rounded-xl font-semibold tracking-wide transition-all relative z-10 ${
                isDrafting ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              }`}
            >
              {isDrafting ? 'Agent Drafting Pitch...' : 'Generate Pitch'}
            </button>
          </div>

          {statusMsg.text && (
            <div className={`p-4 rounded-xl border text-sm ${
              statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              statusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* Right Column: Draft Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white/70 font-medium text-sm uppercase tracking-wider">Draft Editor</h3>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDraft('shorter')}
                  disabled={!targetContext || isDrafting}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Make it Shorter
                </button>
                <button
                  onClick={() => handleDraft('more_technical')}
                  disabled={!targetContext || isDrafting}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Make it More Technical
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient Email (e.g. hiring@company.com)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject (pasted here automatically)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors font-medium"
              />
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Your AI-drafted email body will appear here..."
                className="w-full min-h-[300px] bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white text-sm leading-relaxed placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors overflow-hidden"
              />
            </div>

            <button
              onClick={() => loginAndSend()}
              disabled={isSending || !draft}
              className={`w-full py-5 rounded-xl font-bold tracking-wide transition-all shadow-lg ${
                isSending || !draft 
                ? 'bg-zinc-800 text-white/30 cursor-not-allowed border border-white/5' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-500/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                <span>{isSending ? 'Authenticating & Sending...' : 'Confirm & Dispatch via Gmail'}</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ColdOutreacher() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'MOCK_CLIENT_ID.apps.googleusercontent.com'
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ColdOutreacherContent />
    </GoogleOAuthProvider>
  )
}
