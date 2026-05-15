import { useState, useEffect } from 'react'

function App() {
  const [state, setState] = useState({
    leetcode_rating: '',
    core_skills: [],
    projects: [],
    strategist_comment: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [projectInput, setProjectInput] = useState('')
  const [lcInput, setLcInput] = useState('')

  useEffect(() => {
    fetchState()
  }, [])

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/state?thread_id=engineer_1')
      const data = await res.json()
      setState({
        leetcode_rating: data.leetcode_rating || '',
        core_skills: data.core_skills || [],
        projects: data.projects || [],
        strategist_comment: data.strategist_comment || ''
      })
    } catch (err) {
      console.error("Failed to fetch state", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    let finalLc = state.leetcode_rating
    if (lcInput.trim()) {
      finalLc = lcInput.trim()
      setLcInput('')
    }

    let finalSkills = [...state.core_skills]
    if (skillInput.trim() && !finalSkills.includes(skillInput.trim())) {
      finalSkills.push(skillInput.trim())
      setSkillInput('')
    }
    
    let finalProjects = [...state.projects]
    if (projectInput.trim() && !finalProjects.includes(projectInput.trim())) {
      finalProjects.push(projectInput.trim())
      setProjectInput('')
    }

    // Update local state so UI reflects it instantly
    setState(prev => ({ ...prev, leetcode_rating: finalLc, core_skills: finalSkills, projects: finalProjects }))

    try {
      const res = await fetch('http://localhost:8000/api/state?thread_id=engineer_1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leetcode_rating: finalLc,
          core_skills: finalSkills,
          projects: finalProjects
        })
      })
      const data = await res.json()
      setState(prevState => ({
        ...prevState,
        strategist_comment: data.strategist_comment || prevState.strategist_comment
      }))
    } catch (err) {
      console.error("Failed to update state", err)
    } finally {
      setSaving(false)
    }
  }

  const addLc = (e) => {
    e.preventDefault()
    if (lcInput.trim()) {
      setState({ ...state, leetcode_rating: lcInput.trim() })
      setLcInput('')
    }
  }

  const removeLc = () => {
    setState({ ...state, leetcode_rating: '' })
  }

  const addSkill = (e) => {
    e.preventDefault()
    if (skillInput.trim() && !state.core_skills.includes(skillInput.trim())) {
      setState({ ...state, core_skills: [...state.core_skills, skillInput.trim()] })
      setSkillInput('')
    }
  }

  const removeSkill = (skill) => {
    setState({ ...state, core_skills: state.core_skills.filter(s => s !== skill) })
  }

  const addProject = (e) => {
    e.preventDefault()
    if (projectInput.trim() && !state.projects.includes(projectInput.trim())) {
      setState({ ...state, projects: [...state.projects, projectInput.trim()] })
      setProjectInput('')
    }
  }

  const removeProject = (project) => {
    setState({ ...state, projects: state.projects.filter(p => p !== project) })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading Workspace...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Engineer Workstation</h1>
          <p className="text-muted-foreground mt-1 text-sm">CareerOS Dashboard</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-foreground text-background px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Syncing...' : 'Save & Sync'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column - Stats */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-muted/30 border border-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Competitive Profile</h2>
            <form onSubmit={addLc} className="mb-4">
              <input
                type="text"
                value={lcInput}
                onChange={(e) => setLcInput(e.target.value)}
                placeholder="e.g. 1950 (Knight)"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-muted-foreground"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {state.leetcode_rating ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                  {state.leetcode_rating}
                  <button onClick={removeLc} className="ml-1.5 hover:text-red-400">×</button>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">No rating added.</span>
              )}
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Core Stack</h2>
            <form onSubmit={addSkill} className="mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill (e.g. Java, MERN)"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-muted-foreground"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {state.core_skills.map((skill, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-1.5 hover:text-red-400">×</button>
                </span>
              ))}
              {state.core_skills.length === 0 && <span className="text-xs text-muted-foreground">No skills added.</span>}
            </div>
          </div>
        </div>

        {/* Middle/Right Column - Projects & AI Insights */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-muted/30 border border-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">AI Strategist Insight</h2>
            {state.strategist_comment ? (
              <p className="text-lg font-medium leading-relaxed text-foreground">
                "{state.strategist_comment}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Save your profile to generate an AI strategy insight.
              </p>
            )}
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Active Projects & Impact</h2>
            <form onSubmit={addProject} className="mb-4">
              <input
                type="text"
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                placeholder="Add a project or key impact metric"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-muted-foreground"
              />
            </form>
            <div className="space-y-2">
              {state.projects.map((project, i) => (
                <div key={i} className="flex justify-between items-center bg-background border border-border rounded-md px-4 py-3">
                  <span className="text-sm">{project}</span>
                  <button onClick={() => removeProject(project)} className="text-muted-foreground hover:text-red-400 text-sm">Remove</button>
                </div>
              ))}
              {state.projects.length === 0 && <span className="text-sm text-muted-foreground">No projects tracked yet.</span>}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
