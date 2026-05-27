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
      const res = await fetch('http://localhost:8000/api/evaluations')
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
      const res = await fetch(`http://localhost:8000/api/evaluations/${id}`, {
        method: 'DELETE'
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
    <div className="max-w-4xl mx-auto py-12 px-8 h-full">
      <div className="mb-10">
        <h2 className="text-3xl font-light text-white tracking-tight">Forge Reviews</h2>
        <p className="text-white/50 mt-1 text-sm">Historical evaluations of your stateful crucible sessions.</p>
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
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-md">
          <p className="text-white/40 text-sm">No saved reviews yet.</p>
          <p className="text-white/20 text-xs mt-1">Conclude an interview in The Forge and select "Evaluate" to store reviews permanently.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluations.map((item) => {
            const isExpanded = expandedId === item.id
            return (
              <div 
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`bg-white/5 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                  isExpanded ? 'border-white/20 bg-white/10' : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                }`}
              >
                {/* Header Summary */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-white/30 font-bold block mb-1">Company Target</span>
                      <h4 className="text-lg font-medium text-white">{item.company}</h4>
                    </div>
                    <div className="border-l border-white/5 h-8"></div>
                    <div>
                      <span className="text-xs uppercase tracking-widest text-white/30 font-bold block mb-1">Concluded At</span>
                      <p className="text-sm text-white/60">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wider border ${
                      item.score >= 80 ? 'text-green-400 border-green-500/20 bg-green-500/5' : 
                      item.score >= 60 ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' : 
                      'text-red-400 border-red-500/20 bg-red-500/5'
                    }`}>
                      {item.score}/100
                    </div>

                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Critique permanently"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-5">
                        <h5 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Key Strengths
                        </h5>
                        <ul className="space-y-2">
                          {item.strengths && item.strengths.map((s, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed">• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
                        <h5 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Weakness Points
                        </h5>
                        <ul className="space-y-2">
                          {item.weaknesses && item.weaknesses.map((w, idx) => (
                            <li key={idx} className="text-sm text-white/80 leading-relaxed">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {item.recommended_study_topic && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-1">Recommended Attack Vector</p>
                          <p className="text-lg font-medium text-blue-400">{item.recommended_study_topic}</p>
                        </div>
                        <button 
                          onClick={() => handlePlanWithAI(item.recommended_study_topic)}
                          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                        >
                          Plan with AI Planner ⚡
                        </button>
                      </div>
                    )}
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
