'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                ATS Resume Scorer
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Next-generation resume analysis platform utilizing semantic NLP, skill evidence validation,
              and AI-driven insights to help job seekers bypass ATS filters.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/scorer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  ATS Scanner
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Past Analyses
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Resume Resources
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Privacy & Quality
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>No scanned data resale</li>
              <li>Row-Level Security (RLS)</li>
              <li>Local NLP Fallbacks</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800/60 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2025 ATS Resume Checker. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" /> for job seekers worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
