import { useState } from 'react'
import { LogOut } from 'lucide-react'

export default function Sidebar({ activeModule, setActiveModule, activeResumeLabel, userEmail, onLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const username = userEmail ? userEmail.split('@')[0] : 'Engineer';
  const initial = username.charAt(0).toUpperCase();
  
  const navItems = [
    { id: 'engine', label: 'Context Engine', short: 'CE' },
    { id: 'hunt', label: 'Job Radar', short: 'JR' },
    { id: 'outreach', label: 'Outreach Agent', short: 'OA' },
    { id: 'interview', label: 'Mock Interview', short: 'MI' },
    { id: 'proving_grounds', label: 'Proving Grounds', short: 'PG' },
    { id: 'forge_history', label: 'Evaluation Forge', short: 'EF' },
    { id: 'strategist', label: 'Strategist', short: 'ST' }
  ]

  return (
    <div className={`h-full bg-white/[0.02] border-r border-white/[0.05] flex flex-col backdrop-blur-2xl relative z-20 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'w-20 px-3 py-6' : 'w-72 p-6'}`}>
      
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
            className={`w-full transition-all duration-300 text-sm font-medium flex items-center ${isCollapsed ? 'justify-center p-3 rounded-2xl' : 'text-left px-4 py-3 rounded-xl'} ${
              activeModule === item.id 
                ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                : 'text-white/40 hover:bg-white/[0.04] hover:text-white border border-transparent'
            }`}
          >
            {isCollapsed ? item.short : item.label}
          </button>
        ))}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className={`flex flex-col items-center gap-3 ${isCollapsed ? '' : 'px-2'}`}>
          {/* Avatar + name */}
          <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initial}
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap overflow-hidden flex-1">
                <p className="text-sm font-medium text-white truncate">{username}</p>
                <p className="text-xs text-white/40 truncate">
                  {activeResumeLabel ? `Context: ${activeResumeLabel}` : 'System Ready'}
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className={`flex items-center justify-center gap-2 p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors w-full`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Log Out</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
