import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/15 to-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Resume Intelligence
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Beat the ATS Filters with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              Validated Proof
            </span>
            , Not Just Keywords.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
            Applicant Tracking Systems don&apos;t just match keywords anymore. Our AI validates your skills
            against concrete project evidence, detects privacy pitfalls, and scores compatibility in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10">
            <Link
              href="/scorer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Scan Your Resume Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/resources"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm transition"
            >
              Explore ATS Guide & Resources
            </Link>
          </div>

          {/* Social Proof Metric Chips */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Free Instant Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Semantic Sentence Embeddings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Downloadable PDF Reports</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 sm:py-24 bg-white/50 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              Comprehensive Scoring System
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for Modern Hiring Algorithms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Semantic Keyword Matching
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Uses high-dimensional SentenceTransformers to measure true contextual relevance between your resume
                and the target job description—not just naive keyword repetition.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Skill Evidence Validation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Checks whether every skill you list has supporting context inside your projects and work experience.
                Never get penalized for unsubstantiated claims.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Formatting & Privacy Audit
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Flags table layout traps, multi-column parsing errors, repeated punctuation typos, and excessive location
                details like street addresses or postal codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Walkthrough */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              Simple 3-Step Workflow
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              From Upload to ATS-Optimized in Under 30 Seconds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                Upload Your Resume
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Drag and drop your PDF or DOCX resume. Optionally paste or upload the target job description.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                Instant NLP Evaluation
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Our FastAPI engine breaks down formatting, keyword matches, action verbs, and skill evidence.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white font-black text-lg flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                Fix & Download Report
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Review concrete before/after bullet improvements and download a formal multi-page PDF report.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/scorer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition hover:scale-105"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
