'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  TrendingUp,
  Trash2,
  Download,
  Calendar,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Lock
} from 'lucide-react';
import { getHistory, deleteHistory, getHistoryPdf, type HistoryItem } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<HistoryItem | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (ignore) return;
        if (!session) {
          setSignedIn(false);
          setLoading(false);
          return;
        }
        setSignedIn(true);
        const items = await getHistory();
        if (!ignore) {
          setHistoryItems(items);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load analysis history.';
          setErrorMsg(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis record?')) return;
    try {
      await deleteHistory(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete item';
      alert(msg);
    }
  };

  const handleDownloadPdf = async (id: string, jobTitle: string) => {
    setDownloadingId(id);
    try {
      const blob = await getHistoryPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ats_report_${jobTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PDF';
      alert(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // Prepare chart data (chronological)
  const chartData = [...historyItems]
    .reverse()
    .map((item, idx) => ({
      index: idx + 1,
      date: item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Scan ${idx + 1}`,
      score: Math.round(item.ats_score),
      title: item.job_title,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              User History
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Past Resume Analyses
          </h1>
        </div>

        <Link
          href="/scorer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          New Scan
        </Link>
      </div>

      {!signedIn ? (
        <div className="max-w-md mx-auto text-center p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm my-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Sign in to track your past ATS scans, view improvement graphs over time, and download historical reports.
          </p>
          <Link
            href="/login?next=/history"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition"
          >
            Sign in to view history
          </Link>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">Loading your history records...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-bold underline">Retry</button>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="max-w-lg mx-auto text-center p-12 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 my-8">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Past Analyses Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Run your first resume scan to start tracking your score progression and keyword matches.
          </p>
          <Link
            href="/scorer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20"
          >
            Go to ATS Scorer
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Score Over Time Chart */}
          {chartData.length > 1 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  ATS Score Progression Over Time
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-800">
                              <p className="font-bold">{data.title}</p>
                              <p className="text-emerald-400 font-semibold mt-0.5">Score: {data.score} / 100</p>
                              <p className="text-slate-400 text-[10px]">{data.date}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Analyses List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                History Records ({historyItems.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {historyItems.map((item) => {
                const score = Math.round(item.ats_score);
                let scoreBadge = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200';
                if (score >= 80) scoreBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
                else if (score >= 60) scoreBadge = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`px-2.5 py-1.5 rounded-xl border text-center flex-shrink-0 ${scoreBadge}`}>
                        <span className="text-lg font-black leading-none">{score}</span>
                        <span className="block text-[9px] font-bold uppercase tracking-wider mt-0.5">ATS</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.job_title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {item.filename || 'resume'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                          </span>
                          {item.keyword_match > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {item.keyword_match.toFixed(0)}% JD Match
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => setSelectedAnalysis(item)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Details
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(item.id, item.job_title)}
                        disabled={downloadingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Download PDF report"
                      >
                        {downloadingId === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        PDF
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete analysis record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Analysis Snapshot</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAnalysis.job_title}</h3>
                <p className="text-xs text-slate-400">{selectedAnalysis.filename} • {new Date(selectedAnalysis.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <span className="text-slate-400">ATS Overall Score:</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">{Math.round(selectedAnalysis.ats_score)} / 100</p>
                </div>
                <div>
                  <span className="text-slate-400">JD Keyword Overlap:</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">{selectedAnalysis.keyword_match}%</p>
                </div>
              </div>

              {selectedAnalysis.missing_keywords && selectedAnalysis.missing_keywords.length > 0 && (
                <div>
                  <h4 className="font-bold text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wider">Missing Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedAnalysis.missing_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAnalysis.analysis_result?.strengths && (
                <div>
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wider">Strengths:</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    {selectedAnalysis.analysis_result.strengths.map((str, i) => (
                      <li key={i}>• {str}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => handleDownloadPdf(selectedAnalysis.id, selectedAnalysis.job_title)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Download Full PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
