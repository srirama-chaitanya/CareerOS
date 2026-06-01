import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import AdvocateChat from './components/AdvocateChat'
import EngineRoom from './components/EngineRoom'
import AutoHunt from './components/AutoHunt'
import ColdOutreacher from './components/ColdOutreacher'
import MockInterviewer from './components/MockInterviewer'
import Strategist from './components/Strategist'
import ProvingGrounds from './components/ProvingGrounds'
import ForgeHistory from './components/ForgeHistory'

function App() {
  const [token, setToken] = useState(localStorage.getItem('career_os_token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('career_os_email') || '');
  
  const [activeModule, setActiveModule] = useState('engine')
  const [activeResumeId, setActiveResumeId] = useState(null)
  const [activeResumeLabel, setActiveResumeLabel] = useState('')
  const [strategistTopic, setStrategistTopic] = useState('')
  const [provingGroundsProblem, setProvingGroundsProblem] = useState(null)
  const [unlockedDay, setUnlockedDay] = useState(1)
  const [outreachTargetContext, setOutreachTargetContext] = useState('')

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
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('career_os_token');
    localStorage.removeItem('career_os_email');
    setToken(null);
    setUserEmail('');
  };

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
      const response = await fetch('http://localhost:8000/api/hunt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          search_string: searchQuery,
          active_resume_id: activeResumeId,
          location: location,
          job_type: jobType,
          experience_level: experienceLevel,
          extra_info: extraInfo
        })
      })
      const data = await response.json()
      if (response.ok) {
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

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      {!token ? (
        <Login 
          onLoginSuccess={(newToken, email) => {
            localStorage.setItem('career_os_token', newToken);
            localStorage.setItem('career_os_email', email);
            setToken(newToken);
            setUserEmail(email);
          }} 
        />
      ) : (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-sans selection:bg-indigo-500/30">
          {/* Aurora Glass Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-violet-600/10 blur-[150px]"></div>
            <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[150px]"></div>
            <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[150px]"></div>
          </div>

        <Sidebar 
          activeModule={activeModule} 
          setActiveModule={setActiveModule}
          activeResumeLabel={activeResumeLabel}
          userEmail={userEmail}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
          <div className={activeModule === 'engine' ? 'block h-full' : 'hidden'}>
            <EngineRoom onActiveResumeChange={refreshActiveResume} />
          </div>
          <div className={activeModule === 'hunt' ? 'block h-full' : 'hidden'}>
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
              onDraftOutreach={(jobDescription) => {
                setOutreachTargetContext(jobDescription)
                setActiveModule('outreach')
              }}
            />
          </div>
          <div className={activeModule === 'outreach' ? 'block h-full' : 'hidden'}>
            <ColdOutreacher initialContext={outreachTargetContext} />
          </div>
          <div className={activeModule === 'interview' ? 'block h-full' : 'hidden'}>
            <MockInterviewer 
              activeResumeId={activeResumeId} 
              setActiveModule={setActiveModule}
              setStrategistTopic={setStrategistTopic}
            />
          </div>
          <div className={activeModule === 'strategist' ? 'block h-full' : 'hidden'}>
            <Strategist 
              initialTopic={strategistTopic} 
              setActiveModule={setActiveModule} 
              setProvingGroundsProblem={setProvingGroundsProblem}
              unlockedDay={unlockedDay}
              setUnlockedDay={setUnlockedDay}
            />
          </div>
          <div className={activeModule === 'proving_grounds' ? 'block h-full' : 'hidden'}>
            <ProvingGrounds 
              initialProblem={provingGroundsProblem} 
              onEvaluationSuccess={() => setUnlockedDay(prev => prev + 1)}
              setActiveModule={setActiveModule}
            />
          </div>
          <div className={activeModule === 'forge_history' ? 'block h-full' : 'hidden'}>
            <ForgeHistory 
              setActiveModule={setActiveModule}
              setStrategistTopic={setStrategistTopic}
            />
          </div>
        </main>

          <AdvocateChat />
        </div>
      )}
    </GoogleOAuthProvider>
  )
}

export default App
