import { useState } from 'react'

export default function AutoHunt() {
  const [mode, setMode] = useState('auto')
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobType, setJobType] = useState('FULLTIME')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  const handleSearch = async () => {
    setCurrentPage(1)
    if (mode === 'manual' && !searchQuery.trim()) {
      setError('Please enter a target role to search.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('http://localhost:8000/api/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode,
          query: searchQuery,
          location: location,
          job_type: jobType,
          experience_level: experienceLevel,
          extra_info: extraInfo
        })
      })
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
      } else {
        setError(data.detail || 'Failed to fetch jobs.')
      }
    } catch (err) {
      console.error(err)
      setError('Network error. Backend might be unreachable.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20'
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-8">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">Auto-Hunt Command</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Deploy the Scout Agent to search the live market. It will cross-reference every job against your RAG resume to calculate a strict architectural fit.
        </p>
      </div>

      {/* Mode Toggle & Input */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 mb-8">
          <button
            onClick={() => setMode('auto')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'auto' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            Auto Mode (RAG Driven)
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'manual' ? 'bg-zinc-800 text-white shadow-lg border border-white/10' : 'text-white/50 hover:text-white'}`}
          >
            Manual Search
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-white/70 font-medium mb-4 text-sm uppercase tracking-wider">Universal Filters</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs text-white/50 mb-2">Location Preference</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, San Francisco, London"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2">Employment Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
              >
                <option value="FULLTIME">Full-time</option>
                <option value="CONTRACTOR">Contract</option>
                <option value="INTERN">Internship</option>
                <option value="PARTTIME">Part-time</option>
              </select>
            </div>
          </div>

          {mode === 'manual' && (
            <div className="animate-in fade-in slide-in-from-top-2 border-t border-white/10 pt-6">
              <h3 className="text-white/70 font-medium mb-4 text-sm uppercase tracking-wider">Manual Target Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/50 mb-2">Target Role</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Senior Frontend Developer React"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                  >
                    <option value="">Any Level</option>
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead / Manager</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'auto' && (
            <div className="animate-in fade-in slide-in-from-top-2 border-t border-white/10 pt-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 className="text-blue-300 font-medium text-sm">AI Agent Active</h4>
                  <p className="text-blue-200/60 text-xs mt-1">The LangGraph Scout will read your resume to determine the most optimal Target Role and Experience Level automatically, combining them with your Universal Filters above.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <input
            type="text"
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="Any extra info? (e.g. 'Only Series A startups', 'Exclude FinTech')"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`px-8 py-3 rounded-xl font-semibold tracking-wide transition-all whitespace-nowrap ${
              loading ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            }`}
          >
            {loading ? 'Scouting...' : 'Initiate Job Hunt'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>

      {/* Job Grid */}
      {jobs.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((job, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{job.job_title}</h3>
                    <p className="text-sm text-white/60 mt-1">{job.employer_name} • {job.job_city ? `${job.job_city}, ${job.job_country}` : 'Location NA'} {job.job_is_remote && '• Remote'}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${getScoreColor(job.match_score)}`}>
                    {job.match_score}% Match
                  </div>
                </div>
                
                <div className="bg-black/30 rounded-xl p-4 mb-5 border border-white/5">
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    "{job.match_reason}"
                  </p>
                </div>

                <div className="mt-auto flex space-x-3">
                  <a 
                    href={job.job_apply_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition-colors border border-white/5"
                  >
                    View Job
                  </a>
                  <button className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-sm font-medium py-2 rounded-lg transition-colors">
                    Draft Outreach
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center space-x-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-white/60 text-sm">
              Page {currentPage} of {Math.min(5, Math.ceil(jobs.length / itemsPerPage))}
            </span>
            <button 
              disabled={currentPage >= Math.ceil(jobs.length / itemsPerPage) || currentPage >= 5}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
