import { useState, useEffect } from 'react'

export default function EngineRoom() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/status')
        const data = await res.json()
        if (data.resume_loaded) {
          setIsReady(true)
        }
      } catch (err) {
        console.error("Could not fetch status")
      }
    }
    checkStatus()
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.pdf')) {
      setUploadStatus('Error: Only PDF files are supported.')
      return
    }

    setUploading(true)
    setUploadStatus('Vectorizing resume into ChromaDB...')
    setIsReady(false)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setUploadStatus('Vectorization Complete.')
        setIsReady(true)
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

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">The Engine Room</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Drag and drop your engineering resume. The RAG pipeline will instantly vectorize your architecture depth, tech stack, and impact metrics for the autonomous agents.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
        <div className="relative bg-black/40 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-sm border-dashed border-2 hover:border-blue-500/50 transition-all duration-300">
          
          <input 
            type="file" 
            accept=".pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          <div className="relative pointer-events-none">
            {isReady && !uploading && (
              <div className="inline-flex items-center bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-4 py-1.5 rounded-full mb-8 shadow-lg shadow-green-500/5">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Active Context Loaded
              </div>
            )}

            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
              {uploading ? (
                <svg className="w-10 h-10 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              ) : (
                <svg className="w-10 h-10 text-white/30 group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              )}
            </div>
            
            <h3 className="text-xl font-medium text-white mb-2">
              {uploading ? 'Vectorizing Profile...' : isReady ? 'Drop a new PDF to update context' : 'Drop your Resume PDF'}
            </h3>
            <p className="text-sm text-white/40 mt-2">
              {uploading ? uploadStatus : isReady ? 'Your LangGraph agents now have full context of your history.' : 'Upload your resume to initialize ChromaDB RAG Engine.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
