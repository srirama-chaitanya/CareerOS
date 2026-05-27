import { useState } from 'react'

export default function Sidebar({ activeModule, setActiveModule }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const navItems = [
    { id: 'engine', label: '1. The Engine Room', short: 'E1' },
    { id: 'hunt', label: '2. Auto-Hunt Command', short: 'AH' },
    { id: 'outreach', label: '3. Cold Outreacher', short: 'CO' },
    { id: 'interview', label: '4. Mock Interviewer', short: 'MI' },
    { id: 'strategist', label: '5. The Strategist', short: 'ST' },
    { id: 'proving_grounds', label: '6. Proving Grounds', short: 'PG' },
    { id: 'forge_history', label: '7. Forge Reviews', short: 'FR' }
  ]

  return (
    <div className={`h-full bg-black/40 border-r border-white/10 flex flex-col backdrop-blur-xl relative z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20 px-3 py-6' : 'w-72 p-6'}`}>
      
      <div className={`mb-10 flex items-center ${isCollapsed ? 'justify-center mt-2' : 'justify-between'}`}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-white hover:bg-white/10 group"
            title="Expand Sidebar"
          >
            <span className="block group-hover:hidden font-bold text-xl text-white">C<span className="text-blue-500">OS</span></span>
            <svg className="hidden group-hover:block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white">
                Career<span className="text-blue-500">OS</span>
              </h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1 whitespace-nowrap overflow-hidden">Engineer Workstation</p>
            </div>
            <button 
              onClick={() => setIsCollapsed(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white/50 hover:bg-white/10 hover:text-white"
              title="Collapse Sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </>
        )}
      </div>
      
      <nav className="space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full transition-all text-sm font-medium flex items-center ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'text-left px-4 py-3 rounded-lg'} ${
              activeModule === item.id 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            {isCollapsed ? item.short : item.label}
          </button>
        ))}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-2'}`}>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">E1</div>
          {!isCollapsed && (
            <div className="whitespace-nowrap overflow-hidden">
              <p className="text-sm font-medium text-white">Engineer_1</p>
              <p className="text-xs text-white/40">Offline Mode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
