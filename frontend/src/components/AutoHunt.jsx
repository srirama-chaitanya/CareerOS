import { useState } from 'react'

export default function AutoHunt({ 
  activeResumeId, 
  activeResumeLabel, 
  jobType,
  setJobType,
  experienceLevel,
  setExperienceLevel,
  location,
  setLocation,
  loading,
  jobs,
  error,
  handleSearch,
  onDraftOutreach
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [domain, setDomain] = useState('')
  const [skillsFocus, setSkillsFocus] = useState('')
  const itemsPerPage = 4

  const triggerSearch = () => {
    setCurrentPage(1)
    if (handleSearch) handleSearch({ domain, skillsFocus })
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const locationOptions = [
    { value: 'Remote', label: 'Remote' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'India', label: 'India' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Australia', label: 'Australia' },
  ]

  const noResume = !activeResumeId

  return (
    <div className="max-w-6xl mx-auto py-12 px-8 animate-in fade-in duration-500">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-light text-white tracking-tight">Job Radar</h2>
        <p className="text-white/50 mt-3 text-sm max-w-2xl mx-auto">
          AI-powered job scouting against your active profile. Finds only the freshest listings posted in the last 5 days.
        </p>
      </div>

      {/* Filters + Search */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/5 rounded-3xl blur-xl group-hover:bg-blue-500/10 transition-all duration-500" />
          <div className="relative bg-black/45 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">

            {/* No resume warning */}
            {noResume && (
              <div className="flex items-center gap-2 text-red-400/80 text-xs mb-5 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                No active resume loaded. Please select a profile in the Context Engine first.
              </div>
            )}

            {/* Dropdowns row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-xs appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                >
                  {locationOptions.map(o => (
                    <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-xs appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <option value="FULLTIME" className="bg-zinc-900">Full-time</option>
                  <option value="CONTRACTOR" className="bg-zinc-900">Contract</option>
                  <option value="INTERN" className="bg-zinc-900">Internship</option>
                  <option value="PARTTIME" className="bg-zinc-900">Part-time</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-xs appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <option value="" className="bg-zinc-900">Any Level</option>
                  <option value="Entry Level" className="bg-zinc-900">Entry Level</option>
                  <option value="Mid Level" className="bg-zinc-900">Mid Level</option>
                  <option value="Senior" className="bg-zinc-900">Senior</option>
                  <option value="Lead" className="bg-zinc-900">Lead / Principal</option>
                </select>
              </div>
            </div>

            {/* Optional filters row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/30 mb-2">
                  Domain <span className="normal-case text-white/20 font-normal">(optional)</span>
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-black/30 border border-white/[0.07] text-white/80 rounded-xl px-4 py-3 text-xs appearance-none focus:outline-none focus:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <option value="" className="bg-zinc-900">Any Domain</option>
                  <option value="Fintech" className="bg-zinc-900">Fintech</option>
                  <option value="SaaS" className="bg-zinc-900">SaaS / B2B</option>
                  <option value="AI / ML" className="bg-zinc-900">AI / ML</option>
                  <option value="Healthcare" className="bg-zinc-900">Healthcare / HealthTech</option>
                  <option value="E-commerce" className="bg-zinc-900">E-commerce</option>
                  <option value="Gaming" className="bg-zinc-900">Gaming</option>
                  <option value="Cybersecurity" className="bg-zinc-900">Cybersecurity</option>
                  <option value="DevTools" className="bg-zinc-900">DevTools / Infrastructure</option>
                  <option value="Edtech" className="bg-zinc-900">Edtech</option>
                  <option value="Startup" className="bg-zinc-900">Early-stage Startup</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-white/30 mb-2">
                  Skills Focus <span className="normal-case text-white/20 font-normal">(optional)</span>
                </label>
                <select
                  value={skillsFocus}
                  onChange={(e) => setSkillsFocus(e.target.value)}
                  className="w-full bg-black/30 border border-white/[0.07] text-white/80 rounded-xl px-4 py-3 text-xs appearance-none focus:outline-none focus:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <option value="" className="bg-zinc-900">Based on Resume</option>
                  <option value="Python" className="bg-zinc-900">Python</option>
                  <option value="JavaScript / TypeScript" className="bg-zinc-900">JavaScript / TypeScript</option>
                  <option value="React" className="bg-zinc-900">React</option>
                  <option value="Node.js" className="bg-zinc-900">Node.js</option>
                  <option value="Java" className="bg-zinc-900">Java</option>
                  <option value="Go" className="bg-zinc-900">Go</option>
                  <option value="Rust" className="bg-zinc-900">Rust</option>
                  <option value="AWS / Cloud" className="bg-zinc-900">AWS / Cloud</option>
                  <option value="DevOps / Kubernetes" className="bg-zinc-900">DevOps / Kubernetes</option>
                  <option value="Machine Learning" className="bg-zinc-900">Machine Learning</option>
                  <option value="System Design" className="bg-zinc-900">System Design</option>
                </select>
              </div>
            </div>

            {/* Active profile context + Deploy button */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
              <div className="text-xs text-white/40 flex items-center gap-2">
                {activeResumeId ? (
                  <>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Scouting for: <strong className="text-white/60">{activeResumeLabel}</strong>
                  </>
                ) : (
                  <span className="text-red-400/60">No profile active</span>
                )}
              </div>

              <button
                onClick={triggerSearch}
                disabled={loading || noResume}
                className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 text-sm flex items-center gap-3 ${
                  loading || noResume
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5'
                }`}
              >
                {loading && <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />}
                {loading ? 'Scouting...' : 'Deploy Scout'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs text-center">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Grid */}
      {jobs.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
            {jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((job, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-2xl hover:bg-white/[0.04] transition-all duration-500 flex flex-col gap-4 shadow-xl group hover:-translate-y-1 hover:border-cyan-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] tracking-widest uppercase font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 border w-max ${getScoreColor(job.match_score)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {job.match_score}/100 Match
                  </span>
                  {job.job_is_remote && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Remote</span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-cyan-400 transition-colors leading-snug">
                    {job.job_title}
                  </h3>
                  <p className="text-xs text-white/50 mt-1 flex items-center gap-2">
                    <span>{job.employer_name}{job.job_city ? ` · ${job.job_city}, ${job.job_country}` : ''}</span>
                    {getRelativeTime(job.job_posted_at_datetime_utc) && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/40 font-medium">
                        {getRelativeTime(job.job_posted_at_datetime_utc)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex-1">
                  <p className="text-xs text-white/60 leading-relaxed italic line-clamp-3">
                    "{job.match_reason}"
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <a
                    href={job.job_apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition-all border border-white/10"
                  >
                    View Posting
                  </a>
                  <button
                    onClick={() => onDraftOutreach && onDraftOutreach(job.job_description || `Target Role: ${job.job_title} at ${job.employer_name}\n\n${job.job_apply_link}`)}
                    className="flex-1 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 text-xs font-semibold py-2.5 rounded-xl transition-all"
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
