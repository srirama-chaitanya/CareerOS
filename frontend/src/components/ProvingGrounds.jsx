import { Terminal, Zap, Lock } from 'lucide-react';

export default function ProvingGrounds() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-transparent relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
          <Terminal className="w-9 h-9 text-indigo-400" />
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-6">
          <Lock className="w-3 h-3" />
          Coming Soon
        </div>

        <h2 className="text-4xl font-light text-white tracking-tight mb-4">
          Proving Grounds
        </h2>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          A real-time code execution environment with AI-powered Staff-Engineer critique is under construction. 
          We're building something that will actually challenge you.
        </p>

        <div className="flex items-center gap-2 text-xs text-white/25 font-mono">
          <Zap className="w-3.5 h-3.5 text-indigo-500/50" />
          Estimated: Q1 2027
        </div>
      </div>
    </div>
  );
}
