'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  FileCheck,
  AlertCircle,
  Download,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server
} from 'lucide-react';
import { checkHealth, analyzeResume, parseJd, generatePdf, type AnalysisResponse } from '@/lib/api';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { ComponentBar } from '@/components/ui/component-bar';
import { IssueCard } from '@/components/ui/issue-card';

const PROGRESS_MESSAGES = [
  'Reading resume document and extracting text...',
  'Extracting technical skills, tools, and experience history...',
  'Validating skills against concrete project evidence...',
  'Running semantic matching against target job requirements...',
  'Analyzing formatting consistency and ATS layout compliance...',
  'Compiling AI recommendations and actionable feedback...',
];

export default function ScorerPage() {
  // Server health state
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'cold_starting' | 'error'>('checking');

  // Input states
  const [analysisMode, setAnalysisMode] = useState<'general' | 'jd'>('general');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jdInputMethod, setJdInputMethod] = useState<'paste' | 'upload'>('paste');
  const [jdText, setJdText] = useState('');
  const [jdParsing, setJdParsing] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsgIndex, setProgressMsgIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResponse | null>(null);

  // PDF download state
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  // Initial Health Check
  useEffect(() => {
    let isMounted = true;
    checkHealth()
      .then((data) => {
        if (isMounted) {
          if (data.status === 'healthy') {
            setServerStatus('ready');
          } else {
            setServerStatus('cold_starting');
          }
        }
      })
      .catch(() => {
        if (isMounted) setServerStatus('cold_starting');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cycling progress messages during analysis
  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setProgressMsgIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleResumeSelect = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.pdf', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF or DOCX resume.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(`Resume exceeds the maximum 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB uploaded).`);
      return;
    }

    setResumeFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleResumeSelect(e.dataTransfer.files[0]);
    }
  };

  const handleJdFileUpload = async (file: File) => {
    setJdParsing(true);
    setErrorMessage(null);
    try {
      const parsed = await parseJd(file);
      setJdText(parsed.text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not parse JD file';
      setErrorMessage(msg);
    } finally {
      setJdParsing(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!resumeFile) {
      setErrorMessage('Please select or upload your resume first.');
      return;
    }

    setErrorMessage(null);

    // Verify authentication before submitting
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErrorMessage('AUTH_REQUIRED: Please sign in or create an account first to analyze and save your resume.');
      return;
    }

    setAnalyzing(true);
    setProgressMsgIndex(0);

    try {
      const jobDesc = analysisMode === 'jd' ? jdText : undefined;
      const data = await analyzeResume(resumeFile, jobDesc);
      setResults(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze resume. Please try again.';
      if (msg.includes('Authorization') || msg.includes('token') || msg.includes('401')) {
        setErrorMessage('AUTH_REQUIRED: Your session has expired. Please sign in again to continue.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!results) return;
    setPdfDownloading(true);
    try {
      const blob = await generatePdf(results);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ats_report_${(results.job_title || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PDF report';
      setErrorMessage(msg);
    } finally {
      setPdfDownloading(false);
    }
  };

  // Sort issues by severity: High -> Moderate -> Low
  const sortedIssues = [...(results?.detailed_feedback || [])].sort((a, b) => {
    const order: Record<string, number> = { high: 0, critical: 0, moderate: 1, medium: 1, low: 2, info: 2 };
    const sevA = order[(a.severity_level || '').toLowerCase()] ?? 1;
    const sevB = order[(b.severity_level || '').toLowerCase()] ?? 1;
    return sevA - sevB;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      {/* Server Health Status Banner */}
      {serverStatus === 'cold_starting' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-amber-800 dark:text-amber-300 text-sm">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span>Backend server is warming up models (~10–15s). You can still prepare your upload.</span>
          </div>
          <button
            onClick={() => {
              setServerStatus('checking');
              checkHealth().then(() => setServerStatus('ready')).catch(() => setServerStatus('cold_starting'));
            }}
            className="flex items-center gap-1 font-semibold text-xs underline hover:no-underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered ATS Scanner
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Scan & Optimize Your Resume
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          Compare your resume against automated ATS filters, check keyword coverage, and inspect project skill validation.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {errorMessage.replace('AUTH_REQUIRED:', '').trim()}
            {errorMessage.startsWith('AUTH_REQUIRED:') && (
              <div className="mt-2.5">
                <a
                  href="/login?next=/scorer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  Sign In or Create Account
                </a>
              </div>
            )}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Upload Box */}
      {!results && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8">
          {/* Mode Selector */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Analysis Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnalysisMode('general')}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                  analysisMode === 'general'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${analysisMode === 'general' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">General ATS Compatibility</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluates formatting, structure, action verbs, and skill validation.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisMode('jd')}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                  analysisMode === 'jd'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${analysisMode === 'jd' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Job Description Match</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Semantic similarity, keyword overlap, and specific role skills gaps.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resume Upload Drag & Drop */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Upload Resume (PDF or DOCX, max 5 MB)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : resumeFile
                    ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleResumeSelect(e.target.files[0])}
                  accept=".pdf,.docx"
                  className="hidden"
                />

                {resumeFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white max-w-[200px] truncate">
                      {resumeFile.name}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      {(resumeFile.size / 1024).toFixed(1)} KB — Click to change file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Drag & drop your resume here
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      or click to browse from your device
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* JD Input (if JD mode) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Job Description {analysisMode === 'general' ? '(Optional)' : '(Required for Match)'}
              </label>

              {analysisMode === 'jd' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setJdInputMethod('paste')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        jdInputMethod === 'paste'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setJdInputMethod('upload')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        jdInputMethod === 'upload'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Upload JD Document
                    </button>
                  </div>

                  {jdInputMethod === 'paste' ? (
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste the job description text here..."
                      className="w-full h-[180px] p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  ) : (
                    <div
                      onClick={() => jdFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 h-[180px] flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <input
                        type="file"
                        ref={jdFileInputRef}
                        onChange={(e) => e.target.files?.[0] && handleJdFileUpload(e.target.files[0])}
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                      />
                      {jdParsing ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-500">Extracting JD text...</span>
                        </div>
                      ) : jdText ? (
                        <div>
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            JD Parsed ({jdText.length} characters)
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">Click to re-upload</p>
                        </div>
                      ) : (
                        <div>
                          <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-1" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Upload JD File (PDF, DOCX, TXT)
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">Parsed automatically via API</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-center h-[220px] flex flex-col items-center justify-center">
                  <Layers className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    General Analysis Enabled
                  </span>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    Your resume will be scored across overall formatting, content quality, and skill evidence.
                    Switch to &ldquo;Job Description Match&rdquo; to test against a specific role.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Button & Loading Progress */}
          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col items-center">
            {analyzing ? (
              <div className="w-full max-w-md text-center space-y-3">
                <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Resume... (10–25s)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[20px] transition-all animate-pulse">
                  {PROGRESS_MESSAGES[progressMsgIndex]}
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full w-2/3 animate-pulse" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!resumeFile}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                <span>Run Complete ATS Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Top Bar: Title & Reset / Download */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full">
                  Target Role
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  {resumeFile?.name || 'Uploaded Resume'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {results.job_title || 'General Professional Profile'}
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => { setResults(null); setResumeFile(null); }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                Scan Another Resume
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pdfDownloading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Top Grid: Gauge + 5 Component Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ScoreGauge score={results.ats_score} interpretation={results.interpretation} />
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                  Component Score Breakdown
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Scores calculated against canonical ATS weightings and quality criteria.
                </p>
              </div>

              <div className="space-y-3">
                <ComponentBar
                  label="Formatting & Layout"
                  score={results.component_scores.formatting}
                  maxScore={results.score_maxima?.formatting ?? 20}
                  description="Section headings, single-column readability, bullet point structure."
                />
                <ComponentBar
                  label="Keywords & Terminology"
                  score={results.component_scores.keywords}
                  maxScore={results.score_maxima?.keywords ?? 25}
                  description="Density of role-specific technical skills, domain phrases, and industry terms."
                />
                <ComponentBar
                  label="Content & Impact"
                  score={results.component_scores.content}
                  maxScore={results.score_maxima?.content ?? 25}
                  description="Action verbs, measurable metrics, and grammar accuracy."
                />
                <ComponentBar
                  label="Skill Evidence Validation"
                  score={results.component_scores.skill_validation}
                  maxScore={results.score_maxima?.skill_validation ?? 15}
                  description="Validation of listed technical skills substantiated in actual projects/experience."
                />
                <ComponentBar
                  label="ATS Compatibility"
                  score={results.component_scores.ats_compatibility}
                  maxScore={results.score_maxima?.ats_compatibility ?? 15}
                  description="Absence of parsing blockers, table layout traps, and privacy risks."
                />
              </div>
            </div>
          </div>

          {/* JD Comparison Match (if present) */}
          {results.jd_comparison && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-600" />
                    Target Job Description Match Analysis
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparison based on keyword overlap and semantic sentence embeddings.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                    Keyword Match: {results.jd_comparison.match_percentage}%
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
                    Similarity: {(results.jd_comparison.semantic_similarity * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Matched Keywords */}
              {results.jd_comparison.matched_keywords && results.jd_comparison.matched_keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Matched Keywords ({results.jd_comparison.matched_keywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {results.jd_comparison.matched_keywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {results.jd_comparison.missing_keywords && results.jd_comparison.missing_keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> Missing Keywords ({results.jd_comparison.missing_keywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {results.jd_comparison.missing_keywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Gap */}
              {results.jd_comparison.skills_gap && results.jd_comparison.skills_gap.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Skills Gap ({results.jd_comparison.skills_gap.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {results.jd_comparison.skills_gap.map((sg, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {sg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skill Evidence Validation Section */}
          {results.skill_validation_details && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Skill Evidence Validation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cross-referencing listed technical skills against practical project and experience descriptions.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  {results.skill_validation_details.validated_count} of {results.skill_validation_details.total} Validated ({results.skill_validation_details.validation_pct}%)
                </div>
              </div>

              {/* Validated Table */}
              {results.skill_validation_details.validated && results.skill_validation_details.validated.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="py-2.5 pr-4">Skill</th>
                        <th className="py-2.5 pr-4">Evidence Found In</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {results.skill_validation_details.validated.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 pr-4 font-bold text-slate-800 dark:text-slate-200">{String(item.skill ?? '')}</td>
                          <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-400">
                            {Array.isArray(item.projects) ? item.projects.join(', ') : 'Project context'}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Substantiated
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Unvalidated Skills */}
              {results.skill_validation_details.unvalidated && results.skill_validation_details.unvalidated.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                    Skills Missing Context ({results.skill_validation_details.unvalidated.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    These skills are listed on your resume but not backed by any bullet points in your projects or work history:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {results.skill_validation_details.unvalidated.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actionable Feedback & Issue Cards */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Detailed Feedback & Required Fixes ({sortedIssues.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prioritized issues detected in your resume structure, keyword coverage, and content formatting.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sortedIssues.map((issue, idx) => (
                <IssueCard key={idx} issue={issue} />
              ))}
            </div>
          </div>

          {/* Strengths */}
          {results.strengths && results.strengths.length > 0 && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Strong Resume Attributes
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                {results.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
