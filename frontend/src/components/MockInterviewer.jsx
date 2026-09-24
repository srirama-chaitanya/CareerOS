import { useState, useEffect, useRef } from 'react'

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function MockInterviewer({ activeResumeId, setActiveModule, setStrategistTopic }) {
  const [chatHistory, setChatHistory] = useState([])
  const [targetCompany, setTargetCompany] = useState('none')
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(() => generateUUID())

  // Evaluation States
  const [showEvalPrompt, setShowEvalPrompt] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)

  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const fullTranscriptRef = useRef('')
  const isListeningRef = useRef(false)
  const fullAssistantMessageRef = useRef('')
  const typeWriterIntervalRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Global utterance queue to prevent browser garbage collection bugs (stops/repeats)
  if (!window.utteranceQueue) {
      window.utteranceQueue = []
  }

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory, isSpeaking, loading])

  // Setup Web Speech API Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript
          } else {
            interim += event.results[i][0].transcript
          }
        }
        if (final) {
           fullTranscriptRef.current += final + ' '
        }
        setInputText(fullTranscriptRef.current + interim)
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
            console.error("Speech recognition error", event.error)
            setIsListening(false)
            isListeningRef.current = false
            setError('Microphone error: ' + event.error)
        }
      }

      recognition.onend = () => {
        // If the API automatically cuts off but we still want to listen, restart it
        if (isListeningRef.current) {
            try { recognition.start() } catch (e) {}
        }
      }

      recognitionRef.current = recognition
    } else {
      console.warn("Speech Recognition API not supported in this browser.")
    }
    
    // Cleanup
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const toggleListen = () => {
    if (isListening) {
      isListeningRef.current = false
      setIsListening(false)
      recognitionRef.current?.stop()
      
      // Auto-send the transcript when they manually click stop recording
      setTimeout(() => {
          handleSendMessage(fullTranscriptRef.current || inputText)
      }, 300)
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
      setError('')
      fullTranscriptRef.current = ''
      setInputText('')
      isListeningRef.current = true
      setIsListening(true)
      try { recognitionRef.current?.start() } catch (e) {}
    }
  }

  const speakText = (text) => {
    if (!window.speechSynthesis) return

    
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Attempt to find a standard Google US English voice for better pronunciation
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Google UK English Male'))
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    
    utterance.rate = 1.0
    utterance.pitch = 1.0 

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
        setIsSpeaking(false)
        // Cleanup from global queue
        window.utteranceQueue = window.utteranceQueue.filter(u => u !== utterance)
    }
    utterance.onerror = () => setIsSpeaking(false)

    window.utteranceQueue.push(utterance)
    window.speechSynthesis.speak(utterance)
  }

  const startTypewriter = () => {
      if (typeWriterIntervalRef.current) return;
      typeWriterIntervalRef.current = setInterval(() => {
          setChatHistory(prev => {
              if (prev.length === 0) return prev;
              const lastMsg = prev[prev.length - 1];
              
              if (lastMsg.role === 'assistant' && lastMsg.content.length < fullAssistantMessageRef.current.length) {
                  const newHistory = [...prev];
                  // Reveal 2 characters per tick (~100 chars per second) to sync naturally with speech
                  newHistory[newHistory.length - 1].content = fullAssistantMessageRef.current.substring(0, lastMsg.content.length + 2);
                  return newHistory;
              }
              
              // If fully caught up, we can pause the interval to save CPU, but we'll let it run until stream finishes.
              return prev;
          })
      }, 20)
  }

  const handleSendMessage = async (textOverride = null) => {
    const messageToSend = textOverride || inputText
    if (!messageToSend.trim() && chatHistory.length > 0) return

    if (!activeResumeId) {
      setError("Please select an active resume in the Engine Room first.")
      return
    }

    // Stop speaking if interrupted
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)

    const historyToSend = [...chatHistory]
    const updatedHistoryUI = messageToSend.trim() 
        ? [...chatHistory, { role: 'user', content: messageToSend }] 
        : chatHistory
        
    setChatHistory([...updatedHistoryUI, { role: 'assistant', content: '' }])
    if (messageToSend.trim()) setInputText('')
    
    setLoading(true)
    setError('')

    // Set up AbortController for stream cancellation
    if (abortControllerRef.current) {
        abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/interview/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          session_id: sessionId,
          active_resume_id: activeResumeId,
          target_company: targetCompany,
          new_message: messageToSend,
          chat_history: historyToSend
        })
      })

      if (!res.ok) throw new Error('Stream request failed')
      
      setLoading(false)
      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      fullAssistantMessageRef.current = ""
      let spokenTextLength = 0
      
      // Kick off the typewriter sync loop
      startTypewriter()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const rawChunk = decoder.decode(value, { stream: true })
        
        // Parse SSE format: split on double-newlines, strip "data: " prefix
        const lines = rawChunk.split('\n\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const chunk = trimmed.slice(6) // strip "data: "
        
          if (chunk.includes('[Error:')) {
            const errMsg = chunk.substring(chunk.indexOf('[Error:') + 7, chunk.lastIndexOf(']')).trim()
            setError(errMsg || 'Gemini API free tier rate limit exceeded. Please check your quota or billing plan.')
            setLoading(false)
            fullAssistantMessageRef.current = ''
            setChatHistory(prev => prev.slice(0, -1))
            break
          }
          
          fullAssistantMessageRef.current += chunk
          
          // Progressive TTS Chunking (Zero-Skip Algorithm)
          let unspoken = fullAssistantMessageRef.current.substring(spokenTextLength)
          let boundaryMatch = unspoken.match(/[.!?\n]+(\s|$)/)
          
          while (boundaryMatch) {
              const boundaryIndex = boundaryMatch.index
              const boundaryLength = boundaryMatch[0].length
              const consumedLength = boundaryIndex + boundaryLength
              
              const sentenceToSpeak = unspoken.substring(0, consumedLength)
              
              // Only speak if it contains actual letters, ignore empty markdown blocks
              if (sentenceToSpeak.trim().match(/[a-zA-Z0-9]/)) {
                  speakText(sentenceToSpeak.replace(/\*/g, '').trim())
              }
              
              spokenTextLength += consumedLength
              
              unspoken = fullAssistantMessageRef.current.substring(spokenTextLength)
              boundaryMatch = unspoken.match(/[.!?\n]+(\s|$)/)
          }
        } // end SSE line loop
      }
      
      // Speak remaining trailing text
      const remainingText = fullAssistantMessageRef.current.substring(spokenTextLength).trim()
      if (remainingText && remainingText.match(/[a-zA-Z0-9]/)) {
          speakText(remainingText.replace(/\*/g, ''))
      }
      
      // Ensure the interval eventually clears
      setTimeout(() => {
          clearInterval(typeWriterIntervalRef.current)
          typeWriterIntervalRef.current = null
          // Final snap to full text just in case typewriter missed a char
          setChatHistory(prev => {
              if (prev.length === 0) return prev
              const newHistory = [...prev]
              if (newHistory[newHistory.length - 1].role === 'assistant') {
                  newHistory[newHistory.length - 1].content = fullAssistantMessageRef.current
              }
              return newHistory
          })
      }, 5000)

    } catch (err) {
      if (err.name === 'AbortError') {
          console.log('Stream aborted.')
          return
      }
      console.error(err)
      setError('Network error. Backend might be unreachable.')
      setLoading(false)
    } finally {
        abortControllerRef.current = null
    }
  }

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEndInterview = () => {
    // Kill any active streams immediately
    if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
    }
    // Kill typewriter engine
    if (typeWriterIntervalRef.current) {
        clearInterval(typeWriterIntervalRef.current)
        typeWriterIntervalRef.current = null
    }
    
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    setLoading(false)
    
    // Instead of wiping chat, ask user if they want to evaluate
    setShowEvalPrompt(true)
  }

  const handleDiscardSession = () => {
    setChatHistory([])
    setInputText('')
    setError('')
    setSessionId(generateUUID()) // Reset session so it doesn't pollute the next interview
    setShowEvalPrompt(false)
  }

  const handleEvaluateSession = async () => {
    setShowEvalPrompt(false)
    setIsEvaluating(true)
    setError('')

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/evaluate/interview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
        body: JSON.stringify({ 
          chat_history: chatHistory,
          target_company: targetCompany 
        })
      })

      const data = await res.json()
      if (res.ok) {
        setChatHistory([])
        setInputText('')
        setError('')
        setSessionId(generateUUID())
        setShowEvalPrompt(false)
        setActiveModule('forge_history')
      } else {
        setError(data.detail || 'Failed to evaluate interview.')
      }
    } catch (err) {
      console.error("Evaluation Error:", err)
      setError("Failed to generate review. Network might be unreachable.")
    } finally {
      setIsEvaluating(false)
    }
  }

  const handlePlanWithAI = (topic) => {
    setStrategistTopic(topic)
    setActiveModule('strategist')
  }
  
  // Kick off the interview if chat is empty
  const handleStartInterview = () => {
      handleSendMessage("Start interview")
  }

  return (
    <div className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-8 h-full flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl font-light text-white tracking-tight flex items-center gap-3">
            The Forge 
          </h2>
          <p className="text-white/50 mt-1 text-sm">Stateful technical crucible.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <select 
            value={targetCompany}
            onChange={(e) => {
              setTargetCompany(e.target.value)
              if (chatHistory.length > 0) handleEndInterview()
            }}
            className="bg-zinc-900 border border-white/20 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-lg appearance-none cursor-pointer"
          >
            <option className="bg-zinc-900 text-white py-2" value="none">Generic (Rigorous Staff Engineer)</option>
            <option className="bg-zinc-900 text-white py-2" value="google">Google</option>
            <option className="bg-zinc-900 text-white py-2" value="amazon">Amazon</option>
            <option className="bg-zinc-900 text-white py-2" value="meta">Meta</option>
          </select>
          {chatHistory.length > 0 && (
            <button 
                onClick={handleEndInterview}
                className="text-xs text-red-400/80 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-colors"
            >
                End Session
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm absolute top-24 left-1/2 -translate-x-1/2 z-50">
          {error}
        </div>
      )}

      {/* Cinematic Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative mt-8 mb-16">
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto transition-all duration-500">
            {/* The Avatar */}
            <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${isSpeaking ? 'scale-105' : 'scale-100'} ${chatHistory.length === 0 ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                {/* Speaking Aura */}
                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-cyan-500/30 blur-2xl scale-125 animate-pulse' : 'bg-transparent blur-md scale-100'}`}></div>
                
                {/* Listening Aura */}
                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500/20 blur-xl scale-110 animate-pulse' : 'bg-transparent blur-md scale-100'}`}></div>
                
                <img src="/ai_avatar.png" alt="AI Interviewer" className={`w-full h-full object-cover rounded-full relative z-10 border-4 border-zinc-800 shadow-2xl transition-all duration-700 ${chatHistory.length === 0 ? 'grayscale' : ''}`} />
            </div>

            {/* Status Text */}
            <div className="mt-8 text-center h-8">
                <h3 className="text-xl font-medium text-white tracking-wide">
                    {targetCompany !== 'none' ? `${targetCompany.charAt(0).toUpperCase() + targetCompany.slice(1)} AI` : 'Interviewer Core'}
                </h3>
                <p className={`text-sm mt-2 transition-opacity ${chatHistory.length === 0 ? 'text-white/50' : isSpeaking ? 'text-cyan-400 opacity-100' : isListening ? 'text-red-400 opacity-100' : loading ? 'text-blue-400 opacity-100' : 'text-white/30 opacity-100'}`}>
                    {chatHistory.length === 0 ? 'Dormant. Click the red button to begin.' : isSpeaking ? 'Speaking...' : isListening ? 'Listening (Speak freely)...' : loading ? 'Thinking...' : 'Waiting'}
                </p>
            </div>

            {/* The Big Record/Start Button */}
            <div className="mt-12 flex justify-center">
                <button
                    onClick={chatHistory.length === 0 ? handleStartInterview : toggleListen}
                    disabled={loading}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        chatHistory.length === 0
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] text-white scale-100'
                        : isListening 
                        ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110 text-white' 
                        : isSpeaking 
                        ? 'bg-amber-500/20 border-2 border-amber-500/50 hover:bg-amber-500/40 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'bg-zinc-800 border-2 border-white/20 hover:border-white/50 hover:bg-zinc-700 text-white shadow-lg'
                    }`}
                    title={chatHistory.length === 0 ? "Begin Interview" : isListening ? "Stop Recording & Submit" : isSpeaking ? "Interrupt AI" : "Start Speaking"}
                >
                    {chatHistory.length === 0 ? (
                        <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> // Play icon
                    ) : isListening ? (
                        <div className="w-6 h-6 bg-white rounded-sm"></div> // Stop square
                    ) : isSpeaking ? (
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg> // Interrupt icon (Stop/X)
                    ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    )}
                </button>
            </div>
            {/* Instruction hint */}
            <p className="mt-6 text-xs text-white/20 font-medium tracking-wider uppercase">
                {chatHistory.length === 0 ? 'Ensure active resume is selected' : isListening ? 'Click stop when finished speaking' : isSpeaking ? 'Click to interrupt' : 'Click microphone to speak'}
            </p>
          </div>
        {/* Evaluation Prompt Overlay */}
        {showEvalPrompt && !isEvaluating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md text-center">
              <h3 className="text-2xl font-semibold text-white mb-2">Interview Concluded</h3>
              <p className="text-white/60 mb-6 text-sm">Would you like to store this session and receive an AI-generated Staff Engineer review of your performance?</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={handleDiscardSession}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={handleEvaluateSession}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg transition-colors"
                >
                  Save & Evaluate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evaluating Loading State */}
        {isEvaluating && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
             <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <p className="text-white/70 animate-pulse font-medium tracking-wide">Analyzing Transcript...</p>
          </div>
        )}
      </div>
    </div>
  )
}
