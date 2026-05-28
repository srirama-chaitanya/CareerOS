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
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 px-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
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
            className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button
          onClick={handleSubmit}
          disabled={isEvaluating}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:shadow-none"
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
        <div className="bg-red-950/50 border-b border-red-900/50 px-6 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Problem Statement */}
        <div className="w-1/3 min-w-[350px] border-r border-slate-800 bg-slate-900/30 p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-purple-400 text-sm font-bold uppercase tracking-wider">
            Target Problem
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-6">{problem.problem_title}</h3>
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
            {problem.problem_statement}
          </div>
        </div>

        {/* Right Side: Code Editor */}
        <div className="flex-1 relative flex flex-col bg-[#1e1e1e]">
          {/* Editor Tabs */}
          <div className="flex-none flex items-center bg-[#252526] border-b border-[#3c3c3c]">
            <div 
              onClick={() => setActiveTab('solution')}
              className={`flex items-center px-4 py-2.5 text-sm font-mono border-r border-[#3c3c3c] cursor-pointer transition-colors ${
                activeTab === 'solution' 
                  ? 'bg-[#1e1e1e] border-t-2 border-t-purple-500 text-slate-200' 
                  : 'text-slate-500 hover:bg-[#2d2d2d] border-t-2 border-t-transparent'
              }`}
            >
              <span className="text-blue-400 mr-2">
                {language === 'javascript' ? 'JS' : language === 'python' ? 'PY' : language === 'java' ? 'JA' : 'C++'}
              </span>
              Solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : 'cpp'}
            </div>
            <div 
              onClick={() => setActiveTab('readme')}
              className={`flex items-center px-4 py-2.5 text-sm font-mono cursor-pointer transition-colors border-r border-[#3c3c3c] ${
                activeTab === 'readme'
                  ? 'bg-[#1e1e1e] border-t-2 border-t-blue-500 text-slate-200'
                  : 'text-slate-500 hover:bg-[#2d2d2d] border-t-2 border-t-transparent'
              }`}
            >
              README.md
            </div>
            
            {/* Reopen critique if minimized */}
            {!showFeedbackPanel && feedback && (
              <div 
                onClick={() => setShowFeedbackPanel(true)}
                className="ml-auto flex items-center px-4 py-2.5 text-purple-400/80 hover:text-purple-400 hover:bg-[#2d2d2d] text-sm font-mono cursor-pointer transition-colors border-t-2 border-t-transparent"
                title="View Last Critique"
              >
                <Bug className="w-4 h-4 mr-2" />
                Staff Critique
              </div>
            )}
          </div>
          <div className="flex-1 relative">
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
        className={`absolute bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-50 flex flex-col transform ${
          isDragging ? 'transition-none' : 'transition-transform duration-300 ease-in-out'
        } ${showFeedbackPanel ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Resizer Handle */}
        <div 
          onPointerDown={handlePointerDown}
          className="absolute top-0 left-0 w-full h-3 -mt-1.5 cursor-ns-resize z-[60] flex items-center justify-center group"
        >
          <div className="w-16 h-1 rounded-full bg-slate-700 group-hover:bg-purple-500 transition-colors"></div>
        </div>

        <div className="flex-none p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            Staff-Engineer Critique
          </h3>
          <button 
            onClick={() => setShowFeedbackPanel(false)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Status & Complexity */}
              <div className="space-y-6">
                {/* Status */}
                <div className={`p-4 rounded-xl border flex items-start gap-4 ${
                  feedback.pass_status 
                    ? 'bg-emerald-950/30 border-emerald-900/50' 
                    : 'bg-red-950/30 border-red-900/50'
                }`}>
                  {feedback.pass_status ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                  )}
                  <div>
                    <h4 className={`text-lg font-bold ${feedback.pass_status ? 'text-emerald-400' : 'text-red-400'}`}>
                      {feedback.pass_status ? 'Evaluation Passed' : 'Evaluation Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${feedback.pass_status ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
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
                      className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                    >
                      Return to Strategist
                    </button>
                  )}
                </div>

                {/* Complexity Matrix */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Clock className="w-3.5 h-3.5" /> Time Complexity
                    </div>
                    <div className="text-lg font-mono font-bold text-blue-400">{feedback.time_complexity}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      <Database className="w-3.5 h-3.5" /> Space Complexity
                    </div>
                    <div className="text-lg font-mono font-bold text-purple-400">{feedback.space_complexity}</div>
                  </div>
                </div>

                {/* Brutal Critique */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h4 className="text-sm font-bold text-slate-300 mb-3">Architectural Critique</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feedback.staff_engineer_critique}
                  </p>
                </div>
              </div>

              {/* Right Column: Bugs & Staff Explanation */}
              <div className="space-y-6">
                {/* Critical Flaws */}
                {feedback.code_issues && feedback.code_issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Bug className="w-4 h-4 text-red-400" /> Architectural Flaws
                    </h4>
                    {feedback.code_issues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                        <p className="text-sm text-red-400 leading-relaxed">• {issue}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Bugs & Edge Cases */}
                {feedback.bugs_and_edge_cases && feedback.bugs_and_edge_cases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
                      <Bug className="w-4 h-4" /> Vulnerabilities & Edge Cases
                    </h4>
                    <ul className="space-y-2">
                      {feedback.bugs_and_edge_cases.map((bug, idx) => (
                        <li key={idx} className="bg-red-950/20 border border-red-900/30 text-red-300/80 text-sm p-3 rounded-lg flex items-start gap-2">
                          <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                          <span>{bug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Staff Explanation */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Staff Feedback</h4>
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{feedback.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
