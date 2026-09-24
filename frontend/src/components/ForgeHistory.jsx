import { useState, useEffect } from 'react'

export default function ForgeHistory({ setActiveModule, setStrategistTopic }) {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const fetchEvaluations = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/evaluations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('career_os_token')}` },
        cache: 'no-store'
      })
      const data = await res.json()
      if (res.ok) {
        setEvaluations(data)
      } else {
        setError('Failed to fetch reviews.')
      }
    } catch (err) {
      console.error(err)
      setError('Network error. Backend might be offline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvaluations()
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this critique permanently?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/evaluations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        }
      })
      if (res.ok) {
        setEvaluations(prev => prev.filter(item => item.id !== id))
        if (expandedId === id) setExpandedId(null)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete review record.')
    }
  }

  const handlePlanWithAI = (topic) => {
    setStrategistTopic(topic)
    setActiveModule('strategist')
  }

  const formatDate = (isoStr) => {
    try {
      // Formats "2026-05-26 23:59:12" or similar
      const d = new Date(isoStr.replace(' ', 'T'))
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (err) {
      return isoStr
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6 lg:px-12 h-full relative z-10">
      <div className="mb-12 text-center md:text-left">
        <h2 className="text-4xl font-light text-white tracking-tight flex items-center justify-center md:justify-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            🛡️
          </div>
          Evaluation Forge
        </h2>
        <p className="text-white/40 text-sm tracking-wide">Historical evaluations of your stateful crucible sessions.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/40 text-xs">Retrieving historical critiques...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs text-center">
          ⚠️ {error}
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-24 border border-white/[0.05] rounded-3xl bg-white/[0.02] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-inner">
             <span className="text-3xl">👻</span>
          </div>
          <h3 className="text-white/90 text-2xl font-light mb-2">Zero Evaluated Sessions</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            The forge is cold. Are you too scared to face the Mock Interviewer, or do you just enjoy the comfort of your comfort zone?
          </p>
          
          <button 
            onClick={() => setActiveModule('interview')}
            className="mt-8 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white text-sm font-bold tracking-wide rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-1"
          >
            Enter the Crucible 🚀
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {evaluations.map((item) => {
            const isExpanded = expandedId === item.id
            return (
              <div 
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`bg-white/[0.02] border backdrop-blur-2xl rounded-3xl overflow-hidden transition-all duration-500 cursor-pointer shadow-xl group ${
                  isExpanded ? 'border-indigo-500/30 bg-white/[0.05] shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-white/[0.05] hover:border-indigo-500/20 hover:bg-white/[0.04]'
                }`}
              >
                {/* Header Summary */}
                <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center space-x-6 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner">
                       {item.company?.toLowerCase() === 'google' ? 'G' : item.company?.toLowerCase() === 'meta' ? 'M' : item.company?.toLowerCase() === 'amazon' ? 'A' : '⚙️'}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-indigo-400/80 font-bold block mb-1">Target Persona</span>
                      <h4 className="text-xl font-medium text-white">{item.company}</h4>
                    </div>
                    <div className="border-l border-white/5 h-10 hidden md:block"></div>
                    <div className="hidden md:block">
                      <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-1">Timestamp</span>
                      <p className="text-sm text-white/50">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 relative z-10 w-full md:w-auto justify-between md:justify-end">
                    <div className={`px-5 py-2.5 rounded-full text-sm font-bold tracking-wider border shadow-lg ${
                      item.score >= 80 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 
                      item.score >= 60 ? 'text-amber-300 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 
                      'text-red-300 border-red-500/30 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    }`}>
                      Score: {item.score}/100
                    </div>

                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all duration-300"
                      title="Delete Critique permanently"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="pt-8 border-t border-white/[0.05]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10">
                          <h5 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="text-red-500">⚠</span> Weaknesses</h5>
                          <ul className="space-y-3">
                            {(item.weaknesses || []).map((weakness, idx) => (
                              <li key={idx} className="flex items-start text-sm text-red-200/70 leading-relaxed">
                                <span className="mr-3 text-red-500/50 font-bold shrink-0">•</span>
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
                          <h5 className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="text-emerald-500">★</span> Strengths</h5>
                          <ul className="space-y-3">
                            {(item.strengths || []).map((strength, idx) => (
                              <li key={idx} className="flex items-start text-sm text-emerald-200/70 leading-relaxed">
                                <span className="mr-3 text-emerald-500/50 font-bold shrink-0">✓</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {item.recommended_study_topic && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group/cta">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover/cta:opacity-100 transition-opacity duration-500"></div>
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase tracking-widest text-indigo-400/50 font-bold mb-2">Recommended Attack Vector</p>
                            <p className="text-lg font-medium text-white">{item.recommended_study_topic}</p>
                          </div>
                          <button 
                            onClick={() => handlePlanWithAI(item.recommended_study_topic)}
                            className="relative z-10 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 whitespace-nowrap"
                          >
                            Deploy Strategist ⚡
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
