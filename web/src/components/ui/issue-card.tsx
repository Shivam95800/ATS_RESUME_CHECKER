'use client';

import React, { useState } from 'react';
import type { IssueDetail } from '@/lib/api';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle, MapPin, Wrench, Sparkles } from 'lucide-react';

interface IssueCardProps {
  issue: IssueDetail;
}

export function IssueCard({ issue }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const severity = issue.severity_level?.toLowerCase() || 'moderate';

  let borderClass = 'border-amber-200 dark:border-amber-900/60';
  let badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  let Icon = AlertTriangle;

  if (severity === 'high' || severity === 'critical') {
    borderClass = 'border-red-200 dark:border-red-900/60';
    badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800';
    Icon = AlertCircle;
  } else if (severity === 'low' || severity === 'info') {
    borderClass = 'border-blue-200 dark:border-blue-900/60';
    badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    Icon = Info;
  }

  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all overflow-hidden ${borderClass}`}>
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${badgeColor} flex-shrink-0 mt-0.5`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                  {issue.severity_level || 'Moderate'} Priority
                </span>
                {issue.ats_impact && (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    ATS Impact: {issue.ats_impact}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {issue.issue_title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={expanded ? 'Collapse issue details' : 'Expand issue details'}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Explanation */}
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
          {issue.explanation}
        </p>

        {/* Where it appears */}
        {issue.where_it_appears && (
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{issue.where_it_appears}</span>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          {/* How to fix */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              How to Fix
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 leading-relaxed">
              {issue.how_to_fix}
            </p>
          </div>

          {/* Action Items */}
          {issue.action_items && issue.action_items.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Action Items
              </div>
              <ul className="space-y-1.5">
                {issue.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Example Improvement */}
          {issue.example_improvement && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Example Improvement
              </div>
              <div className="rounded-lg bg-slate-950 text-slate-200 p-3.5 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800">
                {issue.example_improvement}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
