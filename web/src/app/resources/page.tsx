'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Zap,
  ArrowRight,
  HelpCircle,
  ListChecks
} from 'lucide-react';

const ACTION_VERBS_BY_CATEGORY = {
  'Engineering & Development': [
    'Architected', 'Automated', 'Built', 'Configured', 'Deconstructed', 'Deployed',
    'Engineered', 'Implemented', 'Installed', 'Integrated', 'Launched', 'Migrated',
    'Optimized', 'Refactored', 'Streamlined', 'Tested'
  ],
  'Leadership & Execution': [
    'Chaired', 'Coordinated', 'Delegated', 'Directed', 'Guided', 'Headheaded',
    'Mentored', 'Mobilized', 'Orchestrated', 'Oversaw', 'Pioneered', 'Spearheaded'
  ],
  'Optimization & Growth': [
    'Accelerated', 'Amplified', 'Boosted', 'Condensed', 'Consolidated', 'Decreased',
    'Eliminated', 'Expanded', 'Halved', 'Increased', 'Maximised', 'Minimized',
    'Reduced', 'Saved', 'Scaled', 'Yielded'
  ],
  'Research & Analysis': [
    'Audited', 'Calculated', 'Diagnosed', 'Discovered', 'Evaluated', 'Experimented',
    'Identified', 'Investigated', 'Modeled', 'Quantified', 'Simulated', 'Validated'
  ]
};

const ATS_RULES = [
  {
    title: 'Single-Column Layout',
    status: 'do',
    tip: 'Stick to clean, top-to-bottom single-column templates. Multi-column or split templates frequently cause ATS parsers to read across lines incorrectly.'
  },
  {
    title: 'Standard Section Headings',
    status: 'do',
    tip: 'Use standard names: WORK EXPERIENCE, EDUCATION, SKILLS, PROJECTS. Avoid creative labels like "Where I\'ve Been" or "My Odyssey".'
  },
  {
    title: 'No Tables or Text Boxes',
    status: 'dont',
    tip: 'Many older parsers drop content inside tables, graphical callouts, or floating text boxes entirely.'
  },
  {
    title: 'Omit Street Address & PIN Codes',
    status: 'dont',
    tip: 'Only provide "City, State" or "City, Country". Exact street addresses and postal codes are unnecessary and trigger location privacy risks.'
  },
  {
    title: 'Use Common Vector Formats',
    status: 'do',
    tip: 'Upload PDF or DOCX generated from text processors. Scanned images of resumes (flat bitmaps) cannot be parsed by OCR reliably.'
  },
  {
    title: 'Consistent Date Formats',
    status: 'do',
    tip: 'Format employment dates consistently: "Jan 2023 – Present" or "05/2022 – 08/2023" to ensure work duration calculations succeed.'
  }
];

const FAQS = [
  {
    q: 'How do ATS screening systems calculate my resume score?',
    a: 'ATS algorithms extract keywords, skills, and section blocks, then calculate keyword density, relevance against the job posting, and structural readability. Modern ATS engines also employ semantic similarity algorithms (like BERT or SentenceTransformers) to match related terms.'
  },
  {
    q: 'Can I just paste the entire job description in white text at the bottom?',
    a: 'No. Modern ATS systems strip font formatting and color styles into plain text before parsing. Recruiters will see the stuffed block immediately, and algorithmic fraud detection filters will disqualify the application.'
  },
  {
    q: 'Should I tailor my resume for every single job application?',
    a: 'Yes. Even for the same job title, different companies emphasize different tech stacks and priorities. Tailoring 2–3 experience bullet points and matching the exact phrasing in the job description significantly boosts your score.'
  },
  {
    q: 'What is the XYZ formula for bullet points?',
    a: 'Developed by Google hiring managers: "Accomplished [X], as measured by [Y], by doing [Z]". Example: "Reduced database query latency by 45% [X, Y] by implementing Redis caching and indexing slow PostgreSQL queries [Z]".'
  }
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('Engineering & Development');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          ATS Best Practices & Guides
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Resume Optimization Resources
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          Curated frameworks, action verbs, and formatting rules to ensure your resume passes screening filters.
        </p>
      </div>

      {/* Action Verbs Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              High-Impact Action Verbs Cheat Sheet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Begin every bullet point with a decisive verb to demonstrate proactive ownership and measurable impact.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            {Object.keys(ACTION_VERBS_BY_CATEGORY).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeCategory === cat
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Verbs Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {ACTION_VERBS_BY_CATEGORY[activeCategory as keyof typeof ACTION_VERBS_BY_CATEGORY].map((verb) => (
            <div
              key={verb}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold text-slate-800 dark:text-slate-200 text-center hover:border-blue-300 dark:hover:border-blue-700 transition"
            >
              {verb}
            </div>
          ))}
        </div>
      </section>

      {/* Formatting Do's & Don'ts */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-blue-600" />
          ATS Formatting: Essential Do&apos;s and Don&apos;ts
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Formatting mistakes are the #1 reason qualified candidates are rejected before a human recruiter sees their resume.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ATS_RULES.map((rule, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {rule.status === 'do' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Do
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                      Don&apos;t
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {rule.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {rule.tip}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Google XYZ Framework Box */}
      <section className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-12">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Gold Standard Formula
          </span>
          <h2 className="text-2xl font-black mt-1 mb-3">
            The Google &ldquo;XYZ&rdquo; Bullet Point Framework
          </h2>
          <p className="text-sm text-indigo-200 mb-6 leading-relaxed">
            Accomplished <strong className="text-white">[X]</strong>, as measured by <strong className="text-white">[Y]</strong>, by doing <strong className="text-white">[Z]</strong>.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
              <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">❌ Weak & Passive:</span>
              • Responsible for building backend features and improving performance.
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">✅ Strong & Quantified (XYZ):</span>
              • Reduced checkout latency by 45% [Y] across 100K daily active users [X] by refactoring payment endpoints with FastAPI and Redis caching [Z].
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          Frequently Asked Questions About ATS
        </h2>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                {faq.q}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="text-center mt-12">
        <Link
          href="/scorer"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition hover:scale-105"
        >
          <span>Ready? Test Your Resume Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
