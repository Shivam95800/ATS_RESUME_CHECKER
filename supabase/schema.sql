-- Supabase Schema for AI Resume ATS
-- Table: analyses

CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename TEXT,
    job_title TEXT,
    ats_score FLOAT,
    keyword_match FLOAT,
    missing_keywords JSONB DEFAULT '[]'::jsonb,
    analysis_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own analyses
CREATE POLICY "Users can select their own analyses"
    ON public.analyses
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only INSERT their own analyses
CREATE POLICY "Users can insert their own analyses"
    ON public.analyses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only UPDATE their own analyses
CREATE POLICY "Users can update their own analyses"
    ON public.analyses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only DELETE their own analyses
CREATE POLICY "Users can delete their own analyses"
    ON public.analyses
    FOR DELETE
    USING (auth.uid() = user_id);
