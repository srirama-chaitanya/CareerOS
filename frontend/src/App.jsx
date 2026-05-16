import { useState } from 'react'
import Sidebar from './components/Sidebar'
import AdvocateChat from './components/AdvocateChat'
import EngineRoom from './components/EngineRoom'
import AutoHunt from './components/AutoHunt'
import ColdOutreacher from './components/ColdOutreacher'
import MockInterviewer from './components/MockInterviewer'

function App() {
  const [activeModule, setActiveModule] = useState('engine')

  // Render the correct module based on sidebar selection
  const renderModule = () => {
    switch (activeModule) {
      case 'engine':
        return <EngineRoom />
      case 'hunt':
        return <AutoHunt />
      case 'outreach':
        return <ColdOutreacher />
      case 'interview':
        return <MockInterviewer />
      default:
        return <EngineRoom />
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
