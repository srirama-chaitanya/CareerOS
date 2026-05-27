import { useState, useEffect } from 'react'

export default function EngineRoom({ onActiveResumeChange }) {
  const [resumes, setResumes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [labelInput, setLabelInput] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchResumes = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/resumes')
      if (res.ok) {
        const data = await res.json()
        setResumes(data)
      }
    } catch (err) {
      console.error("Error fetching resumes:", err)
    }
  }

  useEffect(() => {
    fetchResumes()
  }, [])

  const handleFileSelection = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.pdf')) {
      setUploadStatus('Error: Only PDF files are supported.')
      return
    }

    setSelectedFile(file)
    // Suggest a label based on the filename, stripping the extension and replacing dashes/underscores
    const suggestedLabel = file.name
      .replace('.pdf', '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
    
    setLabelInput(suggestedLabel)
    setShowModal(true)
    setUploadStatus('')
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile || !labelInput.trim()) return

    setUploading(true)
    setUploadStatus('Extracting Context for Direct Injection...')
    setShowModal(false)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('label', labelInput.trim())

    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setUploadStatus('Context Extraction Complete.')
        setSelectedFile(null)
        setLabelInput('')
        fetchResumes()
        if (onActiveResumeChange) onActiveResumeChange()
      } else {
        setUploadStatus(`Error: ${data.detail || 'Failed to upload'}`)
      }
    } catch (err) {
      console.error(err)
      setUploadStatus('Error: Network issue during upload.')
    } finally {
      setUploading(false)
    }
  }

  const handleSetActive = async (resumeId) => {
    try {
      const res = await fetch('http://localhost:8000/api/resumes/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId })
      })
      if (res.ok) {
        fetchResumes()
        if (onActiveResumeChange) onActiveResumeChange()
      }
    } catch (err) {
      console.error("Failed to set active resume:", err)
    }
  }

  const handleDeleteResume = async (resumeId) => {
    if (!window.confirm("Are you sure you want to delete this resume? This will permanently purge all related context.")) {
      return
    }
    try {
      const res = await fetch(`http://localhost:8000/api/resumes/${resumeId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchResumes()
        if (onActiveResumeChange) onActiveResumeChange()
      }
    } catch (err) {
      console.error("Failed to delete resume:", err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-8">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">The Engine Room</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Manage your high-performance resumes. Upload tailored profiles, label their specialization, and toggle the active target. The LangGraph agents will dynamically scope their context to the active resume deck.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dropzone & Upload Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
            <div className="relative bg-black/40 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm border-dashed border-2 hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-center min-h-[300px]">
              
              <input 
                type="file" 
                accept=".pdf"
                onChange={handleFileSelection}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />

              <div className="relative pointer-events-none">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
                  {uploading ? (
                    <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  ) : (
                    <svg className="w-8 h-8 text-white/30 group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-white mb-2">
                  {uploading ? 'Extracting Context...' : 'Drop a Resume PDF'}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed px-4">
                  {uploading ? uploadStatus : 'Drag and drop your engineering PDF. You will label its target specialization before extraction.'}
                </p>
              </div>
            </div>
          </div>

          {uploadStatus && !uploading && (
            <div className={`p-4 rounded-xl border text-xs text-center ${
              uploadStatus.startsWith('Error') 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400 shadow-lg shadow-green-500/5'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Right Column: Resume Deck Manager List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-white tracking-tight">Active Resume Deck</h3>
              <span className="text-xs font-semibold px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white/60">
                {resumes.length} Tailored {resumes.length === 1 ? 'Profile' : 'Profiles'}
              </span>
            </div>

            {resumes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h4 className="text-white font-medium text-sm">No profiles loaded</h4>
                <p className="text-xs text-white/40 mt-1 max-w-sm">Drop a new PDF to extract profile context for candidate agents.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {resumes.map((resume) => (
                  <div 
                    key={resume.id} 
                    className={`relative rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 flex flex-col justify-between group ${
                      resume.is_active === 1
                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70 group-hover:scale-105 transition-transform duration-300">
                          📄
                        </div>
                        
                        {resume.is_active === 1 ? (
                          <span className="text-[10px] tracking-wider uppercase font-extrabold px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full shadow-lg shadow-blue-500/5 flex items-center animate-pulse">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
                            Active Agent Context
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleSetActive(resume.id)}
                            className="text-[10px] tracking-wider uppercase font-semibold px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-all"
                          >
                            Set Active
                          </button>
                        )}
                      </div>

                      <h4 className="text-white font-semibold text-base mb-1 tracking-tight truncate">
                        {resume.label}
                      </h4>
                      <p className="text-xs text-white/30 truncate mb-6" title={resume.filename}>
                        {resume.filename}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                      <button 
                        onClick={() => handleSetActive(resume.id)}
                        disabled={resume.is_active === 1}
                        className={`flex items-center text-xs font-medium transition-colors ${
                          resume.is_active === 1 
                            ? 'text-blue-400 cursor-default' 
                            : 'text-white/40 hover:text-white'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border mr-2 flex items-center justify-center transition-all ${
                          resume.is_active === 1 
                            ? 'border-blue-400 bg-blue-500/20 text-blue-400' 
                            : 'border-white/30'
                        }`}>
                          {resume.is_active === 1 && '✓'}
                        </span>
                        Active
                      </button>

                      <button 
                        onClick={() => handleDeleteResume(resume.id)}
                        className="text-white/20 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-300"
                        title="Delete Profile"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Glassmorphic Label Input Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setShowModal(false); setSelectedFile(null); }}
              className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              🏷️
            </div>

            <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
              Label Specialization
            </h3>
            <p className="text-xs text-white/50 mb-6">
              Give this profile a target title. The agent uses this label to directly query JSearch APIs and scope profile context.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-white/50 mb-2">Target Job Title</label>
                <input
                  type="text"
                  required
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Target Job Title (e.g., Backend Developer)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Quick Tags Suggestions */}
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-white/30 mb-2">Quick Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Senior Backend Engineer', 'React Expert', 'Java Platform Architect', 'Data Scientist'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLabelInput(preset)}
                      className="text-[10px] bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded-full border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedFile(null); }}
                  className="flex-1 py-3 border border-white/10 text-white/60 rounded-xl text-xs font-semibold hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
                >
                  Extract Context
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
