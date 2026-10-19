'use client';

import React from 'react';

interface ScoreGaugeProps {
  score: number;
  interpretation?: string;
  size?: number;
}

export function ScoreGauge({ score, interpretation, size = 180 }: ScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let colorClass = 'text-red-500 stroke-red-500';
  let bgGradient = 'from-red-500/10 to-transparent';
  let badgeText = 'Needs Work';
  let badgeColor = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800';

  if (clampedScore >= 80) {
    colorClass = 'text-emerald-500 stroke-emerald-500';
    bgGradient = 'from-emerald-500/10 to-transparent';
    badgeText = 'ATS Ready';
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (clampedScore >= 65) {
    colorClass = 'text-amber-500 stroke-amber-500';
    bgGradient = 'from-amber-500/10 to-transparent';
    badgeText = 'Competitive';
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (clampedScore >= 50) {
    colorClass = 'text-orange-500 stroke-orange-500';
    bgGradient = 'from-orange-500/10 to-transparent';
    badgeText = 'Moderate Match';
    badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  }

  return (
    <div className={`flex flex-col items-center p-6 rounded-2xl bg-gradient-to-b ${bgGradient} border border-slate-200/80 dark:border-slate-800`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-slate-100 dark:text-slate-800/80"
          />
          {/* Progress Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className={`transition-all duration-1000 ease-out ${colorClass}`}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {clampedScore}
          </span>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mt-1">
            out of 100
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeColor}`}>
          {badgeText}
        </span>
        {interpretation && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xs font-medium">
            {interpretation}
          </p>
        )}
      </div>
    </div>
  );
}
