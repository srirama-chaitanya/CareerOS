import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Terminal, Loader2, CheckCircle2, XCircle, Clock, Database, Bug, ChevronRight, ChevronDown } from 'lucide-react';

export default function ProvingGrounds({ initialProblem, onEvaluationSuccess, setActiveModule }) {
  const generateBoilerplate = (lang, title) => {
    const className = title ? title.replace(/[^a-zA-Z0-9]/g, '') : 'Solution';
    const cleanTitle = title || "LRU Cache Implementation";
    
    switch (lang) {
      case 'javascript':
        return `// Target: ${cleanTitle}\n// Execute your technical design here.\n\nclass ${className} {\n  constructor() {\n    // Initialize constraints\n  }\n\n  // Implement core methods\n  execute() {\n    \n  }\n}\n`;
      case 'python':
        return `# Target: ${cleanTitle}\n# Execute your technical design here.\n\nclass ${className}:\n    def __init__(self):\n        # Initialize constraints\n        pass\n\n    # Implement core methods\n    def execute(self):\n        pass\n`;
      case 'java':
        return `// Target: ${cleanTitle}\n// Execute your technical design here.\n\npublic class ${className} {\n    public ${className}() {\n        // Initialize constraints\n    }\n\n    // Implement core methods\n    public void execute() {\n        \n    }\n}\n`;
      case 'cpp':
        return `// Target: ${cleanTitle}\n// Execute your technical design here.\n\nclass ${className} {\npublic:\n    ${className}() {\n        // Initialize constraints\n    }\n\n    // Implement core methods\n    void execute() {\n        \n    }\n};\n`;
      default:
        return '// Write your solution here';
    }
  };

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(() => generateBoilerplate('javascript', initialProblem?.problem_title));
  const [activeTab, setActiveTab] = useState('solution');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  // Resizable Panel State
  const [panelHeight, setPanelHeight] = useState(350);
  const [isDragging, setIsDragging] = useState(false);
  const startY = React.useRef(0);
  const startHeight = React.useRef(0);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.9, startHeight.current + delta));
      setPanelHeight(newHeight);
    };
    const handlePointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, panelHeight]);

  const defaultProblemStatement = `Design an LRU Cache.
Implement the LRUCache class:
- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
- int get(int key) Return the value of the key if the key exists, otherwise return -1.
- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.

The functions get and put must each run in O(1) average time complexity.`;

  const [problem, setProblem] = useState(initialProblem || { problem_title: "LRU Cache Implementation", problem_statement: defaultProblemStatement });

  // Sync when prop changes
  React.useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
      setCode(generateBoilerplate(language, initialProblem.problem_title));
    }
  }, [initialProblem, language]);

  const handleSubmit = async () => {
    setIsEvaluating(true);
    setError(null);
    setFeedback(null);
    setShowFeedbackPanel(false);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate/code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('career_os_token')}`
        },
        body: JSON.stringify({
          problem_statement: problem.problem_statement,
          user_code: activeTab === 'solution' ? code : (activeTab === 'readme' ? code : code) // always send the solution code!
        })
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.status}`);
      }

      const data = await response.json();
      setFeedback(data.evaluation);
      if (data.evaluation.pass_status && onEvaluationSuccess) {
        onEvaluationSuccess();
      }
      setShowFeedbackPanel(true);
    } catch (err) {
      console.error(err);
      setError("Failed to evaluate code. Is the backend running?");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative overflow-hidden z-10">
      {/* Header */}
      <div className="flex-none p-5 px-8 border-b border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h2 className="text-xl font-light text-white flex items-center gap-3 tracking-wide">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Terminal className="w-4 h-4" />
          </div>
          Proving Grounds
        </h2>
        
        <div className="flex items-center gap-4">
          <select 
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              setCode(generateBoilerplate(newLang, problem.problem_title));
            }}
            className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all backdrop-blur-md shadow-inner cursor-pointer"
          >
            <option className="bg-zinc-900 text-white py-2" value="javascript">JavaScript</option>
            <option className="bg-zinc-900 text-white py-2" value="python">Python</option>
            <option className="bg-zinc-900 text-white py-2" value="java">Java</option>
            <option className="bg-zinc-900 text-white py-2" value="cpp">C++</option>
          </select>
          <button
          onClick={handleSubmit}
          disabled={isEvaluating}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:bg-zinc-800 disabled:text-white/30 disabled:border disabled:border-white/10 text-white rounded-xl font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none"
        >
          {isEvaluating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isEvaluating ? 'Evaluating...' : 'Submit for Evaluation'}</span>
        </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-8 py-3 text-red-400 text-sm backdrop-blur-md font-medium tracking-wide">
          ⚠️ {error}
        </div>
      )}

      {/* Split Screen */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6 h-[calc(100%-80px)]">
        {/* Left Side: Problem Statement */}
        <div className="w-1/3 min-w-[350px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-8 overflow-y-auto shadow-xl custom-scrollbar relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-[10px] font-extrabold uppercase tracking-widest text-indigo-400/80">
              Target Problem
            </div>
            <h3 className="text-2xl font-light text-white mb-6 tracking-wide">{problem.problem_title}</h3>
            <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-black/30 p-6 rounded-2xl border border-white/5 shadow-inner">
              {problem.problem_statement}
            </div>
          </div>
        </div>

        {/* Right Side: Code Editor */}
        <div className="flex-1 relative flex flex-col bg-white/[0.01] border border-white/[0.05] backdrop-blur-3xl rounded-3xl shadow-xl overflow-hidden">
          {/* Editor Tabs */}
          <div className="flex-none flex items-center bg-black/20 border-b border-white/[0.05]">
            <div 
              onClick={() => setActiveTab('solution')}
              className={`flex items-center px-6 py-4 text-sm font-mono cursor-pointer transition-all ${
                activeTab === 'solution' 
                  ? 'bg-white/5 border-t-[3px] border-t-indigo-500 text-white shadow-inner' 
                  : 'text-white/40 hover:bg-white/[0.02] hover:text-white/70 border-t-[3px] border-t-transparent'
              }`}
            >
              <span className="text-indigo-400 mr-2 font-bold">
                {language === 'javascript' ? 'JS' : language === 'python' ? 'PY' : language === 'java' ? 'JA' : 'C++'}
              </span>
              Solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : 'cpp'}
            </div>
            <div 
              onClick={() => setActiveTab('readme')}
              className={`flex items-center px-6 py-4 text-sm font-mono cursor-pointer transition-all border-l border-white/[0.05] ${
                activeTab === 'readme'
                  ? 'bg-white/5 border-t-[3px] border-t-blue-500 text-white shadow-inner'
                  : 'text-white/40 hover:bg-white/[0.02] hover:text-white/70 border-t-[3px] border-t-transparent'
              }`}
            >
              README.md
            </div>
            
            {/* Reopen critique if minimized */}
            {!showFeedbackPanel && feedback && (
              <div 
                onClick={() => setShowFeedbackPanel(true)}
                className="ml-auto flex items-center px-6 py-4 text-emerald-400/80 hover:text-emerald-300 hover:bg-white/[0.02] text-sm font-mono cursor-pointer transition-all border-t-[3px] border-t-transparent"
                title="View Last Critique"
              >
                <Bug className="w-4 h-4 mr-2" />
                Staff Critique
              </div>
            )}
          </div>
          <div className="flex-1 relative bg-[#0f1115]/50 backdrop-blur-sm">
            <div className={activeTab === 'solution' ? 'block h-full' : 'hidden h-full'}>
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: true, scale: 0.75, opacity: 0.5 },
                  fontSize: 15,
                  lineHeight: 24,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  padding: { top: 24, bottom: 24 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  formatOnPaste: true,
                  renderLineHighlight: "all",
                  matchBrackets: "always",
                  bracketPairColorization: { enabled: true }
                }}
              />
            </div>
            <div className={activeTab === 'readme' ? 'block h-full' : 'hidden h-full'}>
              <Editor
                height="100%"
                language="markdown"
                theme="vs-dark"
                value={`# ${problem.problem_title}\n\n${problem.problem_statement}`}
                options={{
                  readOnly: true,
                  minimap: { enabled: true, scale: 0.75, opacity: 0.5 },
                  fontSize: 15,
                  lineHeight: 24,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  padding: { top: 24, bottom: 24 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  wordWrap: "on"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Panel (Slide up and Resizable) */}
      <div 
        style={{ height: panelHeight }}
        className={`absolute bottom-0 left-0 w-full bg-[#0f1115]/90 backdrop-blur-3xl border-t border-white/[0.05] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-50 flex flex-col transform ${
          isDragging ? 'transition-none' : 'transition-transform duration-500 ease-in-out'
        } ${showFeedbackPanel ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Resizer Handle */}
        <div 
          onPointerDown={handlePointerDown}
          className="absolute top-0 left-0 w-full h-4 -mt-2 cursor-ns-resize z-[60] flex items-center justify-center group"
        >
          <div className="w-16 h-1 rounded-full bg-white/20 group-hover:bg-indigo-500 transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
        </div>

        <div className="flex-none p-6 border-b border-white/[0.05] flex justify-between items-center bg-black/20">
          <h3 className="text-xl font-light text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
               <Bug className="w-4 h-4" />
            </span>
            Staff-Engineer Critique
          </h3>
          <button 
            onClick={() => setShowFeedbackPanel(false)}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column: Status & Complexity */}
              <div className="space-y-8">
                {/* Status */}
                <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xl relative overflow-hidden group ${
                  feedback.pass_status 
                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                     feedback.pass_status ? 'bg-gradient-to-r from-emerald-500/5 to-transparent' : 'bg-gradient-to-r from-red-500/5 to-transparent'
                  }`}></div>
                  <div className="relative z-10 flex items-center gap-6 w-full">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                        feedback.pass_status ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {feedback.pass_status ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <XCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-xl font-medium tracking-wide ${feedback.pass_status ? 'text-emerald-400' : 'text-red-400'}`}>
                        {feedback.pass_status ? 'Evaluation Passed' : 'Evaluation Failed'}
                      </h4>
                      <p className={`text-sm mt-1 leading-relaxed ${feedback.pass_status ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {feedback.pass_status 
                          ? "Code successfully resolves the constraints." 
                          : "Implementation does not meet Staff-level requirements."}
                      </p>
                    </div>
                    {feedback.pass_status && setActiveModule && (
                      <button 
                        onClick={() => {
                          setShowFeedbackPanel(false);
                          setActiveModule('strategist');
                        }}
                        className="hidden sm:block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                      >
                        Return to Strategist
                      </button>
                    )}
                  </div>
                </div>

                {/* Complexity Matrix */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-black/20 border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center gap-3 text-white/30 text-[10px] font-extrabold uppercase tracking-widest mb-3 relative z-10">
                      <Clock className="w-4 h-4 text-blue-400/70" /> Time Complexity
                    </div>
                    <div className="text-2xl font-mono font-bold text-white relative z-10">{feedback.time_complexity}</div>
                  </div>
                  <div className="bg-black/20 border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="flex items-center gap-3 text-white/30 text-[10px] font-extrabold uppercase tracking-widest mb-3 relative z-10">
                      <Database className="w-4 h-4 text-purple-400/70" /> Space Complexity
                    </div>
                    <div className="text-2xl font-mono font-bold text-white relative z-10">{feedback.space_complexity}</div>
                  </div>
                </div>

                {/* Brutal Critique */}
                <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50"></div>
                  <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                     <Terminal className="w-3 h-3 text-indigo-400" /> Architectural Critique
                  </h4>
                  <p className="text-sm text-white/70 leading-relaxed relative z-10">
                    {feedback.staff_engineer_critique}
                  </p>
                </div>
              </div>

              {/* Right Column: Bugs & Staff Explanation */}
              <div className="space-y-8">
                {/* Critical Flaws */}
                {feedback.code_issues && feedback.code_issues.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-red-400" /> Architectural Flaws
                    </h4>
                    {feedback.code_issues.map((issue, idx) => (
                      <div key={idx} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl shadow-inner">
                        <p className="text-sm text-red-400/80 leading-relaxed flex items-start gap-3">
                           <span className="text-red-500 mt-0.5">•</span> {issue}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Bugs & Edge Cases */}
                {feedback.bugs_and_edge_cases && feedback.bugs_and_edge_cases.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold text-red-400/80 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Bug className="w-4 h-4" /> Vulnerabilities & Edge Cases
                    </h4>
                    <ul className="space-y-3">
                      {feedback.bugs_and_edge_cases.map((bug, idx) => (
                        <li key={idx} className="bg-red-500/5 border border-red-500/10 text-red-300/70 text-sm p-4 rounded-2xl flex items-start gap-3 shadow-inner">
                          <span className="text-red-500 font-bold shrink-0 mt-0.5">→</span>
                          <span>{bug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Staff Explanation */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all"></div>
                  <h4 className="text-[10px] font-extrabold text-indigo-400/80 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
                     <Terminal className="w-3 h-3" /> Staff Feedback
                  </h4>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap relative z-10">{feedback.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
