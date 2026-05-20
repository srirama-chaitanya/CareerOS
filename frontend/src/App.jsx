import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import AdvocateChat from './components/AdvocateChat'
import EngineRoom from './components/EngineRoom'
import AutoHunt from './components/AutoHunt'
import ColdOutreacher from './components/ColdOutreacher'
import MockInterviewer from './components/MockInterviewer'

function App() {
  const [activeModule, setActiveModule] = useState('engine')
  const [activeResumeId, setActiveResumeId] = useState(null)
  const [activeResumeLabel, setActiveResumeLabel] = useState('')

  // Hoisted Auto-Hunt States to run completely in background
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobType, setJobType] = useState('FULLTIME')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [extraInfo, setExtraInfo] = useState('')

  const [loadingHunt, setLoadingHunt] = useState(false)
  const [jobs, setJobs] = useState([])
  const [huntError, setHuntError] = useState('')

  const refreshActiveResume = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/resumes')
      if (res.ok) {
        const data = await res.json()
        const active = data.find(r => r.is_active === 1)
        if (active) {
          setActiveResumeId(active.id)
          setActiveResumeLabel(active.label)
        } else {
          setActiveResumeId(null)
          setActiveResumeLabel('')
        }
      }
    } catch (err) {
      console.error("Error fetching active resume at root:", err)
    }
  }

  useEffect(() => {
    refreshActiveResume()
  }, [])

  // Auto-fill query when label changes, if query has not been manually customized
  useEffect(() => {
    if (activeResumeLabel && !searchQuery) {
      setSearchQuery(activeResumeLabel)
    }
  }, [activeResumeLabel])

  const executeHuntSearch = async () => {
    if (!searchQuery.trim()) {
      setHuntError('Please enter a target role or title to search.')
      return
    }

    setLoadingHunt(true)
    setHuntError('')
    
    try {
      const res = await fetch('http://localhost:8000/api/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_string: searchQuery,
          active_resume_id: activeResumeId,
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
        setHuntError(data.detail || 'Failed to fetch jobs.')
      }
    } catch (err) {
      console.error(err)
      setHuntError('Network error. Backend might be unreachable.')
    } finally {
      setLoadingHunt(false)
    }
  }

  // Render the correct module based on sidebar selection
  const renderModule = () => {
    switch (activeModule) {
      case 'engine':
        return <EngineRoom onActiveResumeChange={refreshActiveResume} />
      case 'hunt':
        return (
          <AutoHunt 
            activeResumeId={activeResumeId} 
            activeResumeLabel={activeResumeLabel} 
            refreshActiveResume={refreshActiveResume} 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            location={location}
            setLocation={setLocation}
            jobType={jobType}
            setJobType={setJobType}
            experienceLevel={experienceLevel}
            setExperienceLevel={setExperienceLevel}
            extraInfo={extraInfo}
            setExtraInfo={setExtraInfo}
            loading={loadingHunt}
            jobs={jobs}
            error={huntError}
            setError={setHuntError}
            handleSearch={executeHuntSearch}
          />
        )
      case 'outreach':
        return <ColdOutreacher />
      case 'interview':
        return <MockInterviewer />
      default:
        return <EngineRoom onActiveResumeChange={refreshActiveResume} />
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Abstract Background Elements for Premium Glassmorphism Look */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[100px]"></div>
      </div>

      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
        {renderModule()}
      </main>

      <AdvocateChat />
    </div>
  )
}

export default App
