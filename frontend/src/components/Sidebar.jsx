import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'

export default function Sidebar({ activeModule, setActiveModule, activeResumeLabel, userEmail, onLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const username = userEmail ? userEmail.split('@')[0] : 'Engineer'
  const initial = username.charAt(0).toUpperCase()

  const navItems = [
    { id: 'engine', label: 'Context Engine', short: 'CE' },
    { id: 'hunt', label: 'Job Radar', short: 'JR' },
    { id: 'outreach', label: 'Outreach Agent', short: 'OA' },
    { id: 'interview', label: 'Mock Interview', short: 'MI' },
    { id: 'proving_grounds', label: 'Proving Grounds', short: 'PG' },
    { id: 'forge_history', label: 'Evaluation Forge', short: 'EF' },
    { id: 'strategist', label: 'Strategist', short: 'ST' },
  ]

  const handleNavClick = (id) => {
    setActiveModule(id)
    setMobileOpen(false)
  }

  const NavContent = ({ collapsed }) => (
    <>
      <nav className="space-y-2 flex-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            title={collapsed ? item.label : ''}
            className={`w-full transition-all duration-300 text-sm font-medium flex items-center ${
              collapsed ? 'justify-center p-3 rounded-2xl' : 'text-left px-4 py-3 rounded-xl'
            } ${
              activeModule === item.id
                ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                : 'text-white/40 hover:bg-white/[0.04] hover:text-white border border-transparent'
            }`}
          >
            {collapsed ? item.short : item.label}
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/10">
        <div className={`flex flex-col items-center gap-3 ${collapsed ? '' : 'px-2'}`}>
          <div className={`flex items-center gap-3 w-full ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap overflow-hidden flex-1">
                <p className="text-sm font-medium text-white truncate">{username}</p>
                <p className="text-xs text-white/40 truncate">
                  {activeResumeLabel ? `Context: ${activeResumeLabel}` : 'System Ready'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Log Out</span>}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* ── MOBILE: Top bar with hamburger ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <h1 className="text-xl font-bold tracking-tighter text-white">
          Career<span className="text-blue-500">OS</span>
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── MOBILE: Slide-in Drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`md:hidden fixed top-0 left-0 h-full z-40 w-72 bg-[#050505] border-r border-white/[0.05] flex flex-col p-6 pt-20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent collapsed={false} />
      </div>

      {/* ── DESKTOP: Collapsible Sidebar ── */}
      <div className={`hidden md:flex h-full bg-white/[0.02] border-r border-white/[0.05] flex-col backdrop-blur-2xl relative z-20 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'w-20 px-3 py-6' : 'w-72 p-6'}`}>
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

        <NavContent collapsed={isCollapsed} />
      </div>
    </>
  )
}
