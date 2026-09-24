import React, { useState, useEffect } from 'react';
import { Calendar, Target, Video, Search, CheckCircle2, ChevronRight, ChevronLeft, Trash2, Rocket, Database } from 'lucide-react';

export default function Strategist({ initialTopic = "", setActiveModule }) {
  const [savedPlans, setSavedPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // 0-based index of visible day card

  const [topic, setTopic] = useState(initialTopic);
  const [duration, setDuration] = useState(3);
  const [goal, setGoal] = useState('revision');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/strategist/plans', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('career_os_token')}` }
      });
      if (res.ok) setSavedPlans(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const executePlanGeneration = async (targetTopic, currentDuration, currentGoal) => {
    if (!targetTopic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/strategist/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
        body: JSON.stringify({ topic: targetTopic.trim(), duration_days: currentDuration, goal: currentGoal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate plan");
      const newPlan = { id: data.id, topic: targetTopic, goal: currentGoal, duration_days: currentDuration, plan: data.plan };
      setActivePlan(newPlan);
      setCurrentDayIndex(0);
      setTopic('');
      await fetchPlans();
    } catch (err) {
      setError(err.message || "Failed to generate attack plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlan = (e) => { e.preventDefault(); executePlanGeneration(topic, duration, goal); };

  const handleDeletePlan = async (e, planId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/strategist/plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('career_os_token')}` }
      });
      if (res.ok) {
        if (activePlan?.id === planId) setActivePlan(null);
        await fetchPlans();
      }
    } catch (err) { console.error(err); }
  };

  React.useEffect(() => {
    if (initialTopic && initialTopic !== topic) {
      setTopic(initialTopic);
      setActivePlan(null);
      setCurrentDayIndex(0);
      executePlanGeneration(initialTopic, duration, goal);
    }
  }, [initialTopic]);

  const getResourceIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'youtube': return <Video className="w-3.5 h-3.5 text-red-400" />;
      default: return <Search className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getResourceHref = (platform, query) => {
    const encoded = encodeURIComponent(query);
    return platform?.toLowerCase() === 'youtube'
      ? `https://www.youtube.com/results?search_query=${encoded}`
      : `https://www.google.com/search?q=${encoded}`;
  };

  const schedule = activePlan?.plan?.daily_schedule || [];
  const totalDays = schedule.length;
  const currentDay = schedule[currentDayIndex];
  const dayNumber = currentDay?.day_number ?? currentDayIndex + 1;

  return (
    <div className="flex flex-col h-full bg-black/40 relative overflow-hidden custom-scrollbar overflow-y-auto">

      {/* Command Bar */}
      <div className="w-full shrink-0 z-10 p-8 border-b border-white/10 bg-black/20 backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-6 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Rocket className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-white tracking-tight">Strategist</h2>
              <p className="text-white/40 text-xs mt-1">Deploy an architectural study protocol.</p>
            </div>
          </div>

          <form onSubmit={handleGeneratePlan} className="flex-1 flex flex-col md:flex-row gap-4 items-center w-full bg-white/5 border border-white/10 p-3 rounded-3xl backdrop-blur-md shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50"></div>
            <div className="flex-1 relative z-10 w-full min-w-[200px]">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Target Topic (e.g. Go Concurrency)"
                className="w-full bg-black/40 border border-white/5 text-white placeholder-white/20 rounded-2xl px-5 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
                disabled={isGenerating}
              />
            </div>
            <div className="flex gap-4 relative z-10 w-full md:w-auto">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isGenerating}
                className="bg-black/40 border border-white/5 text-white rounded-2xl px-5 py-3 appearance-none focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer text-sm w-full md:w-36"
              >
                <option value="revision">Revision</option>
                <option value="learn_from_scratch">From Scratch</option>
                <option value="deep_dive">Deep Dive</option>
              </select>
              <div className="flex items-center bg-black/40 border border-white/5 rounded-2xl px-4 py-3 w-full md:w-28 focus-within:border-emerald-500/50 transition-all">
                <input
                  type="number" min="1" max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  disabled={isGenerating}
                  className="w-full bg-transparent text-white focus:outline-none text-sm text-center"
                />
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider ml-1">Days</span>
              </div>
              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30 text-emerald-950 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none hover:-translate-y-0.5 shrink-0"
              >
                {isGenerating ? <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-950 rounded-full animate-spin"></div> : <Target className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
        {error && (
          <div className="max-w-6xl mx-auto mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400 text-sm">{error}</div>
        )}
      </div>

      <div className="p-4 md:p-8 space-y-10 max-w-[1600px] w-full mx-auto pb-32">

        {/* Saved Plans Deck */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 ml-2 flex items-center gap-2">
            <Database className="w-3 h-3" /> Deployed Protocols
          </h3>
          {savedPlans.length === 0 ? (
            <div className="w-full p-8 border border-white/5 border-dashed rounded-3xl flex items-center justify-center bg-white/[0.01]">
              <p className="text-white/30 text-sm">No strategic plans generated yet.</p>
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar snap-x">
              {savedPlans.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setActivePlan(p); setCurrentDayIndex(0); }}
                  className={`snap-start shrink-0 w-80 group p-6 rounded-3xl cursor-pointer transition-all duration-300 flex flex-col gap-4 relative border shadow-xl ${
                    activePlan?.id === p.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                      : 'bg-white/5 border-white/5 hover:border-emerald-500/20 hover:bg-white/10'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-50 pointer-events-none"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <h4 className={`font-semibold text-lg line-clamp-2 pr-6 leading-relaxed ${activePlan?.id === p.id ? 'text-emerald-300' : 'text-white'}`}>
                      {p.plan?.plan_title || p.topic}
                    </h4>
                    <button
                      onClick={(e) => handleDeletePlan(e, p.id)}
                      className="absolute top-0 right-0 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-xl border border-white/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-auto relative z-10">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-xl border ${activePlan?.id === p.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-black/40 text-white/50 border-white/5'}`}>
                      {p.duration_days} Days
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-xl border ${activePlan?.id === p.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-black/40 text-white/50 border-white/5'}`}>
                      {p.goal?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Day Card Navigator */}
        {activePlan && totalDays > 0 && currentDay && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-4xl mx-auto">

            {/* Plan Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4">
                <Calendar className="w-3.5 h-3.5" />
                {totalDays}-Day Protocol · {activePlan.goal?.replace('_', ' ')}
              </div>
              <h3 className="text-3xl md:text-4xl font-light text-white tracking-tight leading-tight">
                {activePlan.plan?.plan_title || activePlan.topic}
              </h3>
            </div>

            {/* Day Progress Pills */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {schedule.map((d, i) => {
                const isActive = i === currentDayIndex;
                return (
                  <button
                    key={d.day_number}
                    onClick={() => setCurrentDayIndex(i)}
                    className={`w-9 h-9 rounded-full text-xs font-bold border transition-all duration-300 flex items-center justify-center ${
                      isActive
                        ? 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'bg-white/10 text-white/60 border-white/10 hover:border-emerald-500/40 hover:text-white'
                    }`}
                  >
                    {d.day_number}
                  </button>
                );
              })}
            </div>

            {/* Day Card */}
            <div className="bg-[#0f1115] border border-emerald-500/20 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-[2.5rem] pointer-events-none"></div>

              <div className="mb-8 relative z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 mb-2 block">Day {dayNumber} Focus</span>
                <h4 className="text-2xl font-medium text-white leading-tight">{currentDay.focus_area}</h4>
              </div>

              <div className="space-y-8 relative z-10">
                {/* Action Items */}
                <div>
                  <h5 className="text-[10px] font-extrabold text-white/30 uppercase tracking-widest mb-4">Action Protocol</h5>
                  <ul className="space-y-3">
                    {currentDay.action_items?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-sm text-white/70 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500/70 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources */}
                {currentDay.recommended_resources?.length > 0 && (
                  <div className="pt-6 border-t border-white/5">
                    <h5 className="text-[10px] font-extrabold text-white/30 uppercase tracking-widest mb-4">Resource Nodes</h5>
                    <div className="flex flex-wrap gap-3">
                      {currentDay.recommended_resources.map((res, idx) => (
                        <a
                          key={idx}
                          href={getResourceHref(res.platform, res.search_query)}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-3 bg-black/40 hover:bg-emerald-500/10 text-white/60 hover:text-emerald-300 text-xs font-bold rounded-xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300"
                        >
                          {getResourceIcon(res.platform)}
                          <span className="truncate max-w-[200px]">{res.search_query}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
                disabled={currentDayIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Prev Day
              </button>

              <span className="text-white/40 text-xs font-semibold">
                Day {dayNumber} / {totalDays}
              </span>

              <button
                onClick={() => setCurrentDayIndex(i => Math.min(totalDays - 1, i + 1))}
                disabled={currentDayIndex >= totalDays - 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-emerald-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                Next Day <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
