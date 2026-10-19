import { createClient } from './supabase/client';
import type { components } from './api-types';

export type AnalysisResponse = components['schemas']['AnalysisResponse'];
export type ComponentScores = components['schemas']['ComponentScores'];
export type IssueDetail = components['schemas']['IssueDetail'];
export type JDComparison = components['schemas']['JDComparison'];
export type SkillValidationDetails = components['schemas']['SkillValidationDetails'];

export interface HistoryItem {
  id: string;
  filename: string;
  resume_name?: string;
  job_title: string;
  ats_score: number;
  keyword_match: number;
  missing_keywords: string[];
  date: string;
  created_at: string;
  analysis_result: AnalysisResponse;
}

export interface HealthResponse {
  status: string;
  nlp_loaded: boolean;
  embedder_loaded: boolean;
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * Fetch wrapper that automatically attaches Supabase Bearer token,
 * and on 401, attempts a single session refresh and retries.
 */
async function authFetch(
  endpoint: string,
  init: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && !isRetry) {
    // Attempt session refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session) {
      return authFetch(endpoint, init, true);
    }
  }

  return response;
}

export async function checkHealth(): Promise<HealthResponse> {
  const url = `${BACKEND_URL}/api/v1/health`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function parseJd(file: File): Promise<{ text: string; filename: string; char_count: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch('/api/v1/parse-jd', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to parse job description');
  }

  return res.json();
}

export async function analyzeResume(
  file: File,
  jobDescription?: string
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('resume', file);
  if (jobDescription && jobDescription.trim()) {
    formData.append('job_description', jobDescription.trim());
  }

  const res = await authFetch('/api/v1/analyze-resume', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Resume analysis failed. Please try again.');
  }

  return res.json();
}

export async function getHistory(): Promise<HistoryItem[]> {
  const res = await authFetch('/api/v1/history', {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Could not load analysis history.');
  }

  return res.json();
}

export async function deleteHistory(analysisId: string): Promise<{ status: string; id: string }> {
  const res = await authFetch(`/api/v1/history/${encodeURIComponent(analysisId)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to delete history record.');
  }

  return res.json();
}

export async function generatePdf(data: AnalysisResponse): Promise<Blob> {
  const res = await authFetch('/api/v1/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to generate PDF report.');
  }

  return res.blob();
}

export async function getHistoryPdf(analysisId: string): Promise<Blob> {
  const res = await authFetch(`/api/v1/history/${encodeURIComponent(analysisId)}/pdf`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to download PDF for this analysis.');
  }

  return res.blob();
}
