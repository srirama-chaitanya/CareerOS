import React, { useState } from 'react';
import { Calendar, Target, Video, Search, CheckCircle2, FileJson, ChevronRight, Lock } from 'lucide-react';

export default function Strategist({ initialTopic = "", setActiveModule, setProvingGroundsProblem, unlockedDay, setUnlockedDay }) {
  const [plan, setPlan] = useState(null);
  const [topic, setTopic] = useState(initialTopic);
  const [duration, setDuration] = useState(3);
  const [goal, setGoal] = useState('revision');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const executePlanGeneration = async (targetTopic, currentDuration, currentGoal) => {
    if (!targetTopic.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/strategist/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: targetTopic.trim(), 
          duration_days: currentDuration,
          goal: currentGoal
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate plan");
      setPlan(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate attack plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    executePlanGeneration(topic, duration, goal);
  };

  React.useEffect(() => {
    if (initialTopic && initialTopic !== topic) {
      setTopic(initialTopic);
      setPlan(null);
      if (setUnlockedDay) setUnlockedDay(1);
      executePlanGeneration(initialTopic, duration, goal);
    }
  }, [initialTopic]);

  const getResourceIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Video className="w-4 h-4 text-red-400" />;
      case 'google':
        return <Search className="w-4 h-4 text-blue-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const getResourceHref = (platform, query) => {
    const encoded = encodeURIComponent(query);
    return platform.toLowerCase() === 'youtube' 
      ? `https://www.youtube.com/results?search_query=${encoded}`
      : `https://www.google.com/search?q=${encoded}`;
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
          <Target className="w-6 h-6 text-emerald-400" />
          The Strategist
        </h2>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Based on your interview evaluation, this personalized plan is designed to brutally attack your architectural blind spots and prepare you for a Staff-level evaluation.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-12">
        {!plan ? (
          <div className="max-w-xl mt-12 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-slate-200 mb-4">Review & Plan Generator</h3>
            <p className="text-slate-400 text-sm mb-6">
              Enter a specific technical topic, select your learning goal, and set your available time constraint. The Strategist will generate a tailored execution plan.
            </p>
            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. System Design Caching or React Performance"
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={isGenerating}
              />
              <div className="flex gap-4">
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  disabled={isGenerating}
                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="revision">Revision / Interview Prep</option>
                  <option value="learn_from_scratch">Learn from Scratch</option>
                  <option value="deep_dive">Advanced Deep Dive</option>
                </select>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors shrink-0 w-32">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    disabled={isGenerating}
                    className="w-full bg-transparent text-slate-200 focus:outline-none text-center"
                  />
                  <span className="text-slate-400 ml-2 text-sm">Days</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                onClick={() => { if (setUnlockedDay) setUnlockedDay(1); }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-200 rounded-full animate-spin"></div>
                    Generating Attack Plan...
                  </>
                ) : (
                  <>Generate {duration}-Day Plan <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </form>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl relative">
              <button 
                onClick={() => setPlan(null)}
                className="absolute top-6 right-6 text-sm text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg transition-colors"
              >
                New Plan
              </button>
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold tracking-wide uppercase text-sm">
                <Calendar className="w-4 h-4" />
                {plan.duration_days}-Day Attack Plan
              </div>
              <h3 className="text-3xl font-bold text-slate-200">{plan.plan_title}</h3>
            </div>

            <div className="space-y-6">
              {plan.daily_schedule?.map((day) => {
                const isLocked = day.day_number > unlockedDay;
                return (
                <div key={day.day_number} className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all shadow-lg flex flex-col md:flex-row relative ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                  {isLocked && (
                    <div className="absolute inset-0 z-10 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center cursor-not-allowed">
                      <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col items-center shadow-2xl">
                        <Lock className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-slate-300 font-bold text-sm">Pass Day {day.day_number - 1} to Unlock</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-800/50 px-6 py-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-center items-center w-full md:w-48 shrink-0">
                    <span className="font-bold text-slate-300 text-xl mb-2 whitespace-nowrap">Day {day.day_number}</span>
                    <span className="text-xs font-medium px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      Execution
                    </span>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-blue-400 mb-4">{day.focus_area}</h4>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Action Items</h5>
                      <ul className="space-y-3">
                        {day.action_items?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="md:w-1/3 shrink-0">
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Target Resources</h5>
                      <div className="flex flex-col gap-2">
                        {day.recommended_resources?.map((res, idx) => (
                          <a
                            key={idx}
                            href={getResourceHref(res.platform, res.search_query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
                            title={res.search_query}
                          >
                            {getResourceIcon(res.platform)}
                            <span className="truncate">{res.search_query}</span>
                          </a>
                        ))}
                      </div>
                      
                      {day.evaluation_task && !isLocked && (
                        <div className="mt-8 pt-6 border-t border-slate-800">
                          <button
                            onClick={() => {
                              if (setProvingGroundsProblem && setActiveModule) {
                                setProvingGroundsProblem(day.evaluation_task);
                                setActiveModule('proving_grounds');
                              }
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 rounded-xl font-bold transition-all"
                          >
                            <Target className="w-4 h-4" />
                            Test Day {day.day_number} Skills <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
