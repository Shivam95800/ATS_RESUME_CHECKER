'use client';

import React from 'react';

interface ComponentBarProps {
  label: string;
  score: number;
  maxScore: number;
  description?: string;
}

export function ComponentBar({ label, score, maxScore, description }: ComponentBarProps) {
  const percentage = maxScore > 0 ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100))) : 0;

  let barColor = 'bg-red-500';
  let textColor = 'text-red-600 dark:text-red-400';

  if (percentage >= 80) {
    barColor = 'bg-emerald-500';
    textColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (percentage >= 60) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-600 dark:text-amber-400';
  } else if (percentage >= 40) {
    barColor = 'bg-orange-500';
    textColor = 'text-orange-600 dark:text-orange-400';
  }

  return (
    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${textColor}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-slate-400">/ {maxScore.toFixed(0)} pts</span>
          <span className="text-slate-400 font-medium ml-1">({percentage}%)</span>
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
