import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Key, ShieldAlert } from "lucide-react";
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
            Secure, ephemeral execution environments built for high-performance developer tools and rigorous security testing.
          </p>

          <div className="grid gap-12">
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <BookOpen className="text-blue-500" /> Getting Started
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                The Sandbox environment creates a lightweight micro-VM directly attached to your API request. 
                Using minimal <code>chroot</code> and custom namespace isolation locally, or isolated serverless compute instances on Vercel, it ensures your code executes without affecting the main cluster.
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <Key className="text-blue-500" /> Web Integration
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                You can invoke a container build manually by passing a payload to the <code>/api/execute</code> endpoint.
                Provide the constraints such as <code>runtime</code> (e.g., node, python) and <code>code</code>. The returned block will contain standardized output logs and the <code>duration_ms</code>.
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-slate-900 mb-4 flex items-center gap-3">
                <ShieldAlert className="text-blue-500" /> System Limitations
              </h2>
              <div className="p-6 rounded-2xl dark:bg-[#0a0a0a] bg-white border dark:border-white/5 border-slate-200 shadow-sm leading-relaxed dark:text-slate-300 text-slate-700">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Maximum execution timeout is rigorously enforced at 15 seconds.</li>
                  <li>Inbound network ingress is strictly prohibited inside the user container.</li>
                  <li>The container destroys itself, performing zero-trust cleanup upon exit or panic.</li>
                </ul>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
