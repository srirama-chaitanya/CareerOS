import { useState } from 'react'

export default function EngineRoom() {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isReady, setIsReady] = useState(false)

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
      <div className="mb-12">
        <h2 className="text-3xl font-light text-white tracking-tight">The Engine Room</h2>
        <p className="text-white/50 mt-2 text-sm">Initialize the RAG Database by dropping your resume here.</p>
      </div>

      <div className={`relative border-2 border-dashed rounded-3xl p-20 text-center transition-all duration-300 ${isReady ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 bg-black/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]'}`}>
        <input 
          type="file" 
          accept=".pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="pointer-events-none flex flex-col items-center space-y-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-colors ${isReady ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/60'}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isReady 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              }
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-medium text-white tracking-tight">
              {uploading ? 'Processing Data...' : isReady ? 'Resume Vectorized & Ready' : 'Drag & Drop PDF'}
            </h3>
            <p className="text-sm text-white/40 mt-2">
              {uploading ? uploadStatus : isReady ? 'Your LangGraph agents now have full context of your history.' : 'Upload your resume to initialize ChromaDB RAG Engine.'}
            </p>
          </div>
        </div>
      </div>
      
      {isReady && (
        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center space-x-3 text-green-400 text-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          <span>ChromaDB is loaded. Global context established. System is fully operational.</span>
        </div>
      )}
    </div>
  )
}
