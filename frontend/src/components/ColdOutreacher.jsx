import { useState, useRef, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

function ColdOutreacherContent({ initialContext = '' }) {
  const [targetContext, setTargetContext] = useState(initialContext)
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

  // Sync initialContext to local state when it changes
  useEffect(() => {
    if (initialContext) {
      setTargetContext(initialContext)
    }
  }, [initialContext])

  const handleDraft = async (modifier = '') => {
    if (!targetContext.trim()) {
      setStatusMsg({ text: 'Please provide a Job Description or LinkedIn target first.', type: 'error' })
      return
    }

    setIsDrafting(true)
    setStatusMsg({ text: 'LangGraph is processing your profile context and drafting pitch...', type: 'info' })
    
    // If a modifier is passed directly (from quick actions), use that. Otherwise use the selectedTone state.
    const activeModifier = modifier || selectedTone

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
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
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/send_email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
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
        <h2 className="text-4xl font-light text-white tracking-tight">Outreach Agent</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Deploy the Pitch Agent. It scans the job description, pulls your deepest technical feats from your active context, and drafts a hyper-targeted cold email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Target Input */}
        <div className="lg:col-span-5 space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50"></div>
              
              <div className="relative z-10 space-y-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-white/50 mb-3 ml-1">Target Context / Job Description</label>
                  <textarea
                    value={targetContext}
                    onChange={(e) => setTargetContext(e.target.value)}
                    placeholder="Paste the job description or company profile here..."
                    className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all custom-scrollbar resize-none shadow-inner"
                  />
                </div>
                <h4 className="text-white/50 text-xs mb-3 uppercase tracking-wider relative z-10">Select Initial Tone</h4>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setSelectedTone('')}
                    className={`py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                      selectedTone === ''
                      ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-black/40 border-white/10 text-white/40 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setSelectedTone('shorter')}
                    className={`py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                      selectedTone === 'shorter'
                      ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-black/40 border-white/10 text-white/40 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    Shorter
                  </button>
                  <button
                    onClick={() => setSelectedTone('more_technical')}
                    className={`py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                      selectedTone === 'more_technical'
                      ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-black/40 border-white/10 text-white/40 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    Technical
                  </button>
                  <button
                    onClick={() => setSelectedTone('sarcastic')}
                    className={`py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                      selectedTone === 'sarcastic'
                      ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-black/40 border-white/10 text-white/40 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    Sarcastic
                  </button>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleDraft()}
                    disabled={isDrafting}
                    className={`w-full py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 shadow-xl ${
                      isDrafting ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-[0_0_30px_rgba(99,102,241,0.3)] transform hover:-translate-y-0.5'
                    }`}
                  >
                    {isDrafting ? (
                       <span className="flex items-center justify-center gap-3">
                         <span className="w-5 h-5 border-2 border-indigo-900/30 border-t-white rounded-full animate-spin"></span>
                         Architecting Pitch...
                       </span>
                    ) : 'Generate Pitch Protocol'}
                  </button>
                </div>
              </div>
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
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-2xl shadow-xl flex flex-col h-[calc(100vh-16rem)] min-h-[600px]">
            <div className="flex justify-between items-center mb-8 border-b border-white/[0.05] pb-6">
              <h3 className="text-white font-semibold text-sm uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                 Output Terminal
              </h3>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDraft('shorter')}
                  disabled={!targetContext || isDrafting}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-bold tracking-widest text-white/50 hover:text-white hover:border-indigo-500/30 transition-all disabled:opacity-50"
                >
                  Shorter
                </button>
                <button
                  onClick={() => handleDraft('more_technical')}
                  disabled={!targetContext || isDrafting}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-bold tracking-widest text-white/50 hover:text-white hover:border-indigo-500/30 transition-all disabled:opacity-50"
                >
                  Technical
                </button>
                <button
                  onClick={() => handleDraft('sarcastic')}
                  disabled={!targetContext || isDrafting}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-bold tracking-widest text-white/50 hover:text-white hover:border-indigo-500/30 transition-all disabled:opacity-50"
                >
                  Snarky
                </button>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient Email (e.g. hiring@company.com)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject (pasted here automatically)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-medium placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
              />
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="The agent's drafted email will appear here..."
              className="w-full flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white/90 text-sm leading-relaxed placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors custom-scrollbar resize-none shadow-inner"
            />
            
            <div className="pt-6 border-t border-white/[0.05] mt-6">
              <button
                onClick={() => loginAndSend()}
                disabled={isSending || !draft || !recipient}
                className={`w-full py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-xl ${
                  isSending || !draft || !recipient
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-slate-200 transform hover:-translate-y-0.5'
                }`}
              >
                {isSending ? (
                   <span className="w-5 h-5 border-2 border-slate-300 border-t-black rounded-full animate-spin"></span>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    <span>Confirm & Dispatch via Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ColdOutreacherContent
