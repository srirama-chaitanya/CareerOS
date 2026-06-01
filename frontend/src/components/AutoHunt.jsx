import { useState, useEffect } from 'react'

export default function AutoHunt({ 
  activeResumeId, 
  activeResumeLabel, 
  refreshActiveResume,
  searchQuery,
  setSearchQuery,
  location,
  setLocation,
  jobType,
  setJobType,
  experienceLevel,
  setExperienceLevel,
  extraInfo,
  setExtraInfo,
  loading,
  jobs,
  error,
  setError,
  handleSearch,
  onDraftOutreach
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  const triggerSearch = () => {
    setCurrentPage(1)
    if (handleSearch) {
      handleSearch()
    }
  }

  const getContextMessage = () => {
    if (!activeResumeId) {
      return (
        <div className="flex items-center space-x-2 text-red-400/80">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          <span>No active resume loaded. Please select a profile in the Engine Room.</span>
        </div>
      )
    }

    const trimmedQuery = searchQuery.trim()
    const trimmedLabel = activeResumeLabel.trim()

    if (!trimmedQuery) {
      return (
        <div className="flex items-center space-x-2 text-yellow-400/80">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
          <span>Search query is empty. Input a custom title or visit the Engine Room.</span>
        </div>
      )
    }

    if (trimmedQuery.toLowerCase() === trimmedLabel.toLowerCase()) {
      return (
        <div className="flex items-center space-x-2 text-white/40">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Active Context: Bounded to <strong>{activeResumeLabel}</strong> profile.</span>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-2 text-blue-450/90">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
        </span>
        <span>Manual Override: Searching <strong>"{searchQuery}"</strong></span>
      </div>
    )
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-8 animate-in fade-in duration-500">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">Job Radar</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          Deploy the AI Scout to find live job matches. Specify your target in the Smart Search Bar—the agent automatically executes the search and runs a deep match analysis against your active profile context.
        </p>
      </div>

      {/* Unified Smart Search Section */}
      <div className="max-w-3xl mx-auto mb-16 space-y-6">
        
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-xl group-hover:bg-blue-500/10 transition-all duration-500"></div>
          
          <div className="relative bg-black/45 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Target Job Title (e.g., Backend Developer)"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-base placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
                />
              </div>
              <button
                onClick={triggerSearch}
                disabled={loading}
                className={`px-8 py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 whitespace-nowrap text-sm flex items-center justify-center gap-3 ${
                  loading 
                    ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5'
                }`}
              >
                {loading && <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>}
                {loading ? 'Scouting Market...' : 'Deploy Scout'}
              </button>
            </div>

            {/* Restored Advanced Filters Panel inside UI Card */}
            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Location Preference</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, San Francisco"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Job Type</label>
                <div className="relative">
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer text-xs"
                  >
                  <option value="FULLTIME">Full-time</option>
                  <option value="CONTRACTOR">Contract</option>
                  <option value="INTERN">Internship</option>
                  <option value="PARTTIME">Part-time</option>
                </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                  <option value="">Any Level</option>
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead / Principal</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Custom AI Agent Rules & Constraints</label>
              <input
                type="text"
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="e.g. Only Series A startups, Exclude Fintech, Remote only"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            
            {/* Active Resume Context Info */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
              {getContextMessage()}
              
              <span className="text-white/30 hidden md:inline">Smart search autofills title automatically</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs text-center animate-in slide-in-from-top-2">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Job Grid Results */}
      {jobs.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-10">
            {jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((job, idx) => (
              <div 
              key={idx} 
              className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-2xl hover:bg-white/[0.04] transition-all duration-500 flex flex-col md:flex-row gap-8 shadow-xl group hover:-translate-y-1 hover:border-cyan-500/30"
            >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                        {job.job_title}
                      </h3>
                      <p className="text-sm text-white/50 mt-1">
                        {job.employer_name} • {job.job_city ? `${job.job_city}, ${job.job_country}` : 'Location NA'} {job.job_is_remote && '• Remote'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/5 relative">
                    <span className="text-[10px] tracking-widest uppercase font-extrabold px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 rounded-full flex items-center shadow-[0_0_15px_rgba(6,182,212,0.2)] w-max">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-1.5 animate-pulse"></span>
                      Match: {job.match_score}/100
                    </span>
                    <p className="text-sm text-white/80 leading-relaxed italic pt-4">
                      "{job.match_reason}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-col space-y-3 pt-2 w-full md:w-auto">
                  <a 
                    href={job.job_apply_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-3 rounded-xl transition-all border border-white/10"
                  >
                    View Job Posting
                  </a>
                  <button 
                    onClick={() => onDraftOutreach && onDraftOutreach(job.job_description || `Target Role: ${job.job_title} at ${job.employer_name}\n\n${job.job_apply_link}`)}
                    className="flex-1 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 text-sm font-semibold py-3 rounded-xl transition-all"
                  >
                    Draft Outreach
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center space-x-4 border-t border-white/5 pt-8">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-medium"
            >
              Previous
            </button>
            <span className="text-white/40 text-xs font-semibold">
              Page {currentPage} of {Math.min(5, Math.ceil(jobs.length / itemsPerPage))}
            </span>
            <button 
              disabled={currentPage >= Math.ceil(jobs.length / itemsPerPage) || currentPage >= 5}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
