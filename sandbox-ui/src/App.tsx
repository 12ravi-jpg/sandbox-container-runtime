import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Routes, Route, Link } from "react-router-dom";
import { 
  Shield, Zap, Terminal as TerminalIcon, 
  Layers, Activity, ChevronRight, CheckCircle2,
  Sun, Moon, ExternalLink, Plus, X, Loader2, Clock
} from "lucide-react";

import Docs from "./Docs";

// ─── Point this at your Hugging Face Space URL ───
const API_BASE = import.meta.env.VITE_API_URL || "https://ror-12-sandbox-backend.hf.space";

const themes = {
  light: "light",
  dark: "dark"
};

const navLinks = ["Features", "How It Works", "Pricing"];

const features = [
  { icon: Shield, title: "Secure Isolation", desc: "Per-execution namespaces and strict process configurations." },
  { icon: Zap, title: "Instant Spin-up", desc: "Warm pools keep execution latency under 50ms consistently." },
  { icon: Layers, title: "Multi-Runtimes", desc: "Run JS, Python, Rust, and Go environments effortlessly." },
  { icon: TerminalIcon, title: "CLI Native", desc: "Dev-first CLI workflows seamlessly hook into the API." },
];

const howItWorks = [
  { step: "01", title: "Submit Payload", desc: "Push your code block and constraints via our API." },
  { step: "02", title: "Ephemeral Spawn", desc: "A micro-VM is booted with your requested environment." },
  { step: "03", title: "Stream Result", desc: "Capture real-time logs and get your exit code immediately." },
];

const pricingPlans = [
  { name: "Starter", price: "Free", desc: "For individual developers.", features: ["1,000 runs/mo", "512MB RAM Limit", "Community Support"] },
  { name: "Pro", price: "$49/mo", desc: "For production scaling.", features: ["100k runs/mo", "2GB RAM Limit", "Priority Support"], popular: true },
  { name: "Enterprise", price: "Custom", desc: "For platform teams.", features: ["Unlimited runs", "Custom RAM", "SLA / VPC Peering"] },
];

// ─── Types ───

interface SandboxInstance {
  id: string;
  script: string;
  cpuLimit: number;
  ramLimit: number;
  status: "idle" | "running" | "completed" | "failed";
  lines: string[];
  durationMs?: number;
  dbId?: number;
}

let nextId = 1;
function makeId() { return `sb-${nextId++}-${Date.now()}`; }

function defaultSandbox(): SandboxInstance {
  return {
    id: makeId(),
    script: "echo 'Hello from Sandbox!'\nls -la /\ndate",
    cpuLimit: 2,
    ramLimit: 50,
    status: "idle",
    lines: ["$ waiting for input..."],
  };
}

export default function App() {
  const [theme, setTheme] = useState(themes.dark);

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    changeTheme(isDark ? themes.dark : themes.light);
  }, []);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === themes.dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen text-slate-700 dark:text-slate-300 font-sans selection:bg-blue-500/30 selection:text-white transition-colors duration-300">
      <Navbar theme={theme} onChangeTheme={() => changeTheme(theme === themes.light ? themes.dark : themes.light)} />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>

      <Footer />
    </div>
  );
}

function Navbar({ theme, onChangeTheme }: { theme: string, onChangeTheme: () => void }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed w-full top-0 z-50 pt-6 px-6"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 shadow-xl">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-900 dark:text-white font-bold group-hover:border-blue-500/50 transition-colors">
            SB
          </div>
          <span className="font-heading font-semibold text-slate-900 dark:text-white tracking-tight">Sandbox</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <a key={link} href={`/#${link.toLowerCase().replace(/\s/g, '')}`} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onChangeTheme} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="bg-slate-900 text-white dark:bg-white dark:text-black px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </motion.nav>

    {showHistory && <DashboardModal onClose={() => setShowHistory(false)} />}
    </>
  );
}

function DashboardModal({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/runs`)
      .then(res => res.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200 dark:border-white/10 p-8 w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Execution Dashboard</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-lg font-bold px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg">X</button>
        </div>
        
        {loading ? <p className="text-slate-500 dark:text-slate-400">Loading execution history...</p> : (
          history.length === 0 ? <p className="text-slate-500 dark:text-slate-400">No executions found.</p> : (
            <div className="grid gap-3">
              {history.map(row => (
                <div key={row.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#111] flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-1 block">ID: {row.id} • {new Date(row.created_at * 1000).toLocaleString()}</span>
                    <span className={`text-sm font-semibold ${row.status === 'completed' ? 'text-emerald-500' : 'text-red-500'}`}>{row.status.toUpperCase()}</span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <Zap className="w-4 h-4 inline mr-1" /> {row.duration_ms}ms
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Home() {
  const [sandboxes, setSandboxes] = useState<SandboxInstance[]>([defaultSandbox()]);

  const addSandbox = useCallback(() => {
    setSandboxes(prev => [...prev, defaultSandbox()]);
  }, []);

  const removeSandbox = useCallback((id: string) => {
    setSandboxes(prev => prev.length <= 1 ? prev : prev.filter(s => s.id !== id));
  }, []);

  const updateSandbox = useCallback((id: string, patch: Partial<SandboxInstance>) => {
    setSandboxes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const runSandbox = useCallback(async (id: string) => {
    const sandbox = sandboxes.find(s => s.id === id);
    if (!sandbox || sandbox.status === "running") return;

    updateSandbox(id, {
      status: "running",
      lines: ["$ Sending payload to runtime engine...", "⏳ Waiting for sandbox response..."],
    });

    try {
      const resp = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: sandbox.script,
          cpu_limit_secs: sandbox.cpuLimit,
          mem_limit_mb: sandbox.ramLimit,
        }),
      });
      const data = await resp.json();

      if (resp.ok) {
        const outputLines = data.logs
          .split('\n')
          .filter((l: string) => l.length > 0);
        updateSandbox(id, {
          status: data.status === "completed" ? "completed" : "failed",
          lines: [
            `$ sandbox run --cpu ${sandbox.cpuLimit}s --mem ${sandbox.ramLimit}MB`,
            ...outputLines,
            ``,
            `Exit: ${data.status.toUpperCase()} in ${data.duration_ms}ms (run #${data.id})`,
          ],
          durationMs: data.duration_ms,
          dbId: data.id,
        });
      } else {
        updateSandbox(id, {
          status: "failed",
          lines: ["Error: " + (data.error || JSON.stringify(data))],
        });
      }
    } catch (err: any) {
      updateSandbox(id, {
        status: "failed",
        lines: ["❌ Network request failed. Is the backend running?", err?.message || ""],
      });
    }
  }, [sandboxes, updateSandbox]);

  // We need a stable reference for runSandbox that sees latest sandboxes
  const runSandboxStable = useCallback(async (id: string) => {
    // re-read from state
    setSandboxes(prev => {
      const sandbox = prev.find(s => s.id === id);
      if (!sandbox || sandbox.status === "running") return prev;

      // fire and forget — update optimistically
      (async () => {
        updateSandbox(id, {
          status: "running",
          lines: ["$ Sending payload to runtime engine...", "⏳ Waiting for sandbox response..."],
        });

        try {
          const resp = await fetch(`${API_BASE}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: sandbox.script,
              cpu_limit_secs: sandbox.cpuLimit,
              mem_limit_mb: sandbox.ramLimit,
            }),
          });
          const data = await resp.json();

          if (resp.ok) {
            const outputLines = data.logs
              .split('\n')
              .filter((l: string) => l.length > 0);
            updateSandbox(id, {
              status: data.status === "completed" ? "completed" : "failed",
              lines: [
                `$ sandbox run --cpu ${sandbox.cpuLimit}s --mem ${sandbox.ramLimit}MB`,
                ...outputLines,
                ``,
                `Exit: ${data.status.toUpperCase()} in ${data.duration_ms}ms (run #${data.id})`,
              ],
              durationMs: data.duration_ms,
              dbId: data.id,
            });
          } else {
            updateSandbox(id, {
              status: "failed",
              lines: ["Error: " + (data.error || JSON.stringify(data))],
            });
          }
        } catch (err: any) {
          updateSandbox(id, {
            status: "failed",
            lines: ["❌ Network request failed. Is the backend running?", err?.message || ""],
          });
        }
      })();
      return prev;
    });
  }, [updateSandbox]);

  return (
    <main className="relative z-10 flex flex-col items-center">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-blue-500/5 dark:bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-600/10 blur-[160px] rounded-full" />
      </div>

      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      
      {/* ─── Multi-Sandbox Execution Section ─── */}
      <section id="demo" className="w-full max-w-7xl mx-auto px-6 py-32 z-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-heading md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Run Multiple Sandboxes.</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light leading-relaxed max-w-2xl">
              Spin up multiple isolated execution environments concurrently. Each sandbox runs independently with its own resource limits, connected to the Hugging Face backend.
            </p>
          </div>
          <button 
            onClick={addSandbox}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)] group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Sandbox
          </button>
        </div>

        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {sandboxes.map((sb) => (
              <motion.div
                key={sb.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <SandboxPanel
                  sandbox={sb}
                  onRun={() => runSandboxStable(sb.id)}
                  onRemove={() => removeSandbox(sb.id)}
                  onUpdate={(patch) => updateSandbox(sb.id, patch)}
                  canRemove={sandboxes.length > 1}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <PerformanceSecurity />
      <PricingSection />
    </main>
  );
}

// ─── Individual Sandbox Panel ───

function SandboxPanel({ sandbox, onRun, onRemove, onUpdate, canRemove }: {
  sandbox: SandboxInstance;
  onRun: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<SandboxInstance>) => void;
  canRemove: boolean;
}) {
  const statusColor = {
    idle: "border-slate-300 dark:border-white/10",
    running: "border-blue-500/50 shadow-[0_0_30px_-10px_rgba(37,99,235,0.3)]",
    completed: "border-emerald-500/50 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]",
    failed: "border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]",
  }[sandbox.status];

  const statusBadge = {
    idle: { bg: "bg-slate-100 dark:bg-white/5 text-slate-500", label: "IDLE" },
    running: { bg: "bg-blue-500/10 text-blue-500", label: "RUNNING" },
    completed: { bg: "bg-emerald-500/10 text-emerald-500", label: "COMPLETED" },
    failed: { bg: "bg-red-500/10 text-red-500", label: "FAILED" },
  }[sandbox.status];

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#0a0a0a] transition-all duration-500 ${statusColor}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: sandbox.status === "running" ? "#3b82f6" : sandbox.status === "completed" ? "#10b981" : sandbox.status === "failed" ? "#ef4444" : "#94a3b8" }} />
          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{sandbox.id}</span>
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${statusBadge.bg}`}>{statusBadge.label}</span>
          {sandbox.durationMs !== undefined && (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{sandbox.durationMs}ms</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={sandbox.status === "running"}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {sandbox.status === "running" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
            {sandbox.status === "running" ? "Running..." : "Execute"}
          </button>
          {canRemove && (
            <button onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/5">
        {/* Left: Configuration */}
        <div className="p-6 space-y-4">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Script</label>
          <textarea
            value={sandbox.script}
            onChange={e => onUpdate({ script: e.target.value })}
            disabled={sandbox.status === "running"}
            className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm font-mono text-slate-800 dark:text-slate-200 h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
            placeholder="echo 'hello world'"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">CPU Limit (secs)</label>
              <input
                type="number"
                value={sandbox.cpuLimit}
                onChange={e => onUpdate({ cpuLimit: Number(e.target.value) })}
                disabled={sandbox.status === "running"}
                className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">RAM Limit (MB)</label>
              <input
                type="number"
                value={sandbox.ramLimit}
                onChange={e => onUpdate({ ramLimit: Number(e.target.value) })}
                disabled={sandbox.status === "running"}
                className="w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Right: Terminal output */}
        <div className="relative">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/40">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 text-[10px] font-mono text-slate-400 tracking-wider uppercase">stdout · {sandbox.id}</span>
          </div>
          <div className="p-5 font-mono text-xs leading-6 text-slate-400 dark:text-slate-500 min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-50 dark:bg-[#060606]">
            {sandbox.lines.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="select-none text-slate-300 dark:text-slate-700 w-5 text-right flex-shrink-0">{(i+1).toString().padStart(2, '0')}</span>
                <span className={
                  l.includes("Exit: COMPLETED") ? "text-emerald-400 font-bold" :
                  l.includes("Exit: FAILED") ? "text-red-400 font-bold" :
                  l.startsWith("$") ? "text-blue-400" :
                  l.startsWith("❌") ? "text-red-400" :
                  l.startsWith("⏳") ? "text-amber-400" :
                  "text-slate-600 dark:text-slate-400"
                }>{l}</span>
              </div>
            ))}
            {sandbox.status === "running" && (
              <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="mt-1 w-2 h-3.5 bg-blue-400/60 inline-block ml-8" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function HeroSection() {
  return (
    <section className="w-full max-w-6xl mx-auto min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 pt-32 pb-20 gap-16">
      <div className="flex-1 flex flex-col items-start z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border-slate-200 dark:bg-white/5 border dark:border-white/10 text-xs font-semibold tracking-wider text-blue-500 mb-6"
        >
          <Zap className="w-3 h-3" /> EXTREMELY FAST
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl font-heading md:text-8xl font-bold tracking-tighter text-slate-900 dark:text-white leading-[1.1] mb-6"
        >
          Run Anything.<br />Instantly.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-xl mb-10 leading-relaxed font-light"
        >
          Secure, isolated sandbox environments in seconds. Build platforms that run untrusted code without infrastructure headaches.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-4"
        >
          <a href="#demo" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] flex items-center gap-2 group">
            Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <Link to="/docs" className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white transition-colors">
            Read Docs <ExternalLink className="w-4 h-4 text-slate-500" />
          </Link>
        </motion.div>
      </div>

      <div className="flex-1 w-full h-[500px] relative flex items-center justify-center">
        <FloatingCube />
      </div>
    </section>
  );
}

function FloatingCube() {
  return (
    <div className="relative w-80 h-80 perspective-[1000px]">
      <motion.div
        animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="w-full h-full relative preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <CubeFace translateZ="160px" borderColor="border-blue-500/40" />
        <CubeFace translateZ="-160px" borderColor="border-purple-500/40" rotateY="180deg" />
        <CubeFace translateX="160px" borderColor="border-blue-500/40" rotateY="90deg" />
        <CubeFace translateX="-160px" borderColor="border-purple-500/40" rotateY="-90deg" />
        <CubeFace translateY="-160px" borderColor="border-slate-300/40 dark:border-white/10" rotateX="90deg" />
        <CubeFace translateY="160px" borderColor="border-slate-300/40 dark:border-white/10" rotateX="-90deg" />
        
        {/* Inner glowing core */}
        <div className="absolute inset-0 m-auto w-32 h-32 bg-blue-500/20 blur-3xl rounded-full translate-z-0" />
      </motion.div>
    </div>
  );
}

function CubeFace({ translateZ = '', translateX = '', translateY = '', rotateX = '', rotateY = '', borderColor = 'border-white/10' }) {
  const tZ = translateZ ? `translateZ(${translateZ})` : '';
  const tX = translateX ? `translateX(${translateX})` : '';
  const tY = translateY ? `translateY(${translateY})` : '';
  const rY = rotateY ? `rotateY(${rotateY})` : '';
  const rX = rotateX ? `rotateX(${rotateX})` : '';
  const transformStyle = `${tZ} ${tX} ${tY} ${rY} ${rX}`.trim();
  
  return (
    <div 
      className={`absolute inset-0 w-full h-full border-2 ${borderColor} bg-white/40 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center transition-colors`}
      style={{ transform: transformStyle, WebkitBackfaceVisibility: 'visible', backfaceVisibility: 'visible' }}
    >
      <div className="w-16 h-16 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/50 dark:bg-white/5" />
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="w-full max-w-6xl mx-auto px-6 py-32 z-10">
      <div className="mb-16">
        <h2 className="text-3xl font-heading md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Uncompromised Power.</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg font-light">
          Everything you need to orchestrate safe code execution without boundaries.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="group relative p-8 rounded-3xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 cursor-default"
          >
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-xs rounded-lg py-2 px-3 -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap z-50 shadow-xl">
               Learn more about {feature.title}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
            </div>

            <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 text-slate-700 dark:text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all">
              <feature.icon className="w-6 h-6 stroke-[1.5px]" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-slate-900 dark:text-white mb-3 tracking-tight group-hover:translate-x-1 group-hover:text-blue-500 transition-transform">{feature.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="howitworks" className="w-full max-w-6xl mx-auto px-6 py-32 z-10">
      <div className="text-center mb-24">
        <h2 className="text-3xl font-heading md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Data lifecycle.</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg font-light">
          A purely deterministic flow from payload to execution.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12 relative">
        <div className="hidden md:block absolute top-[5.5rem] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        
        {howItWorks.map((step, i) => (
          <div key={i} className="group relative z-10 flex flex-col items-center text-center cursor-default">
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-xs rounded-lg py-2 px-3 -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap z-50 shadow-xl">
               Phase {step.step}: {step.title}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
            </div>

            <div className="w-16 h-16 rounded-full bg-white dark:bg-[#0a0a0a] border-2 border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-900 dark:text-white font-bold text-lg mb-8 shadow-xl group-hover:scale-110 group-hover:border-blue-500/50 group-hover:text-blue-500 transition-all">
              {step.step}
            </div>
            <h3 className="text-xl font-heading font-semibold text-slate-900 dark:text-white mb-3 group-hover:-translate-y-1 group-hover:text-blue-500 transition-transform">{step.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-light max-w-[250px]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PerformanceSecurity() {
  const stats = [
    { icon: Activity, val: "99.99%", desc: "Uptime SLA for enterprise tiers." },
    { icon: Zap, val: "<10ms", desc: "Average scheduler latency overhead." },
    { icon: Shield, val: "100%", desc: "Cryptographically isolated namespaces." }
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-32 border-y border-slate-200 dark:border-white/5 my-20 z-10">
      <div className="grid md:grid-cols-3 gap-12">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <s.icon className="w-8 h-8 stroke-[1px] text-blue-500 mb-6" />
            <h4 className="text-4xl font-heading font-bold text-slate-900 dark:text-white tracking-tighter mb-2">{s.val}</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-light max-w-[200px]">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="w-full max-w-6xl mx-auto px-6 py-32 z-10">
      <div className="text-center mb-24">
        <h2 className="text-3xl font-heading md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Clear Pricing.</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg font-light">
          Scale your architecture seamlessly without surprising bills.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {pricingPlans.map((plan, i) => (
          <div key={i} className={`relative p-8 rounded-3xl bg-white dark:bg-[#0a0a0a] border transition-all duration-300 ${plan.popular ? 'border-blue-500/50 shadow-2xl scale-105 z-10' : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}>
            {plan.popular && <div className="absolute top-0 right-0 -m-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</div>}
            
            <h3 className="text-xl font-heading font-semibold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{plan.desc}</p>
            
            <div className="my-8">
              <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tighter">{plan.price}</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              {plan.features.map((f, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" /> {f}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => alert(`Redirecting to Stripe checkout for the ${plan.name} plan...`)}
              className={`w-full py-4 rounded-xl font-semibold transition-colors ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white'}`}
            >
              Select Plan
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="w-full max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 dark:border-white/5 mt-20 z-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white">SB</div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-300">Built by Ravi Kumar & Aman Githala</span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-500">© 2026 Sandbox Platform</span>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-500">
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
