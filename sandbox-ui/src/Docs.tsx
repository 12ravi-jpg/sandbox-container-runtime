import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Key, ShieldAlert, Code2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Docs() {
  return (
    <div className="min-h-screen dark:bg-[#050505] bg-slate-50 pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-12 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Sandbox
        </Link>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-heading md:text-5xl font-bold dark:text-white text-slate-900 mb-6 tracking-tight">
            Sandbox Documentation
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">
            Secure, ephemeral execution environments built on <code className="text-blue-400">libc::fork()</code> + <code className="text-blue-400">setrlimit</code> process isolation, hosted on Hugging Face.
          </p>

          <div className="grid gap-12">
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <BookOpen className="text-blue-500" /> Getting Started
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                The Sandbox engine uses <code>libc::fork()</code> to create an isolated child process for every execution request.
                Resource limits (<code>RLIMIT_CPU</code> and <code>RLIMIT_AS</code>) are enforced via <code>setrlimit</code> before the script is executed with <code>/bin/sh -c</code>.
                The parent process captures stdout/stderr via a pipe and records the result in a local SQLite database.
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <Code2 className="text-blue-500" /> API Reference
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700 space-y-6">
                <div>
                  <h3 className="font-bold text-lg dark:text-white text-slate-900 mb-2">POST /run</h3>
                  <p className="mb-2">Execute a script in an isolated sandbox process.</p>
                  <pre className="bg-slate-100 dark:bg-[#111] p-4 rounded-xl text-sm font-mono overflow-x-auto border border-slate-200 dark:border-white/5">
{`{
  "script": "echo hello && date",
  "cpu_limit_secs": 2,
  "mem_limit_mb": 50
}`}
                  </pre>
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-white text-slate-900 mb-2">GET /runs</h3>
                  <p>Returns the last 20 execution records from the SQLite database.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-white text-slate-900 mb-2">GET /</h3>
                  <p>Health check — returns <code>"Sandbox API is running"</code>.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <Key className="text-blue-500" /> Concurrent Execution
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                The backend uses <code>tokio::task::spawn_blocking</code> to offload each <code>fork()</code> call to a dedicated thread pool.
                This means multiple sandbox requests can execute <strong>concurrently</strong> — each in its own forked child process with independent resource limits.
                The actix-web server runs 4 worker threads by default, allowing up to 4 simultaneous sandbox executions.
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <ShieldAlert className="text-blue-500" /> System Limitations
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                <ul className="list-disc pl-5 space-y-2">
                  <li>CPU time is enforced via <code>RLIMIT_CPU</code> — child is killed by SIGXCPU on exceeding.</li>
                  <li>Address space is capped via <code>RLIMIT_AS</code> — allocations beyond the limit will fail.</li>
                  <li>Hugging Face free tier provides 2 vCPU + 16GB RAM — shared across all concurrent sandboxes.</li>
                  <li>The child process is fully destroyed on exit — no state persists between runs.</li>
                </ul>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
