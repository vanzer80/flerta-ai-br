-- FlertaAI Database Schema
-- Phase 0 - Complete initialization with extensions, functions, tables, RLS, storage

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TABLES
-- =============================================

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'pt-BR' NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo' NOT NULL,
  preferences JSONB DEFAULT '{
    "tone": {
      "humor": 50,
      "subtlety": 50,
      "boldness": 50
    },
    "length": "medium",
    "blocked_topics": [],
    "cultural_refs": true,
    "timing_rules": true
  }'::jsonb NOT NULL,
  onboarding_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tinder', 'bumble', 'whatsapp', 'instagram', 'other')),
  screenshot_url TEXT,
  ocr_text TEXT,
  parsed_messages JSONB,
  speaker_confidence NUMERIC(4,3) CHECK (speaker_confidence BETWEEN 0 AND 1),
  needs_confirmation BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  style JSONB NOT NULL,
  reasoning TEXT[],
  alternatives TEXT[],
  cultural_context JSONB,
  timing_appropriate BOOLEAN DEFAULT true NOT NULL,
  accepted BOOLEAN,
  feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5),
  copied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Voice notes table
CREATE TABLE public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT,
  transcript TEXT,
  language TEXT DEFAULT 'pt-BR' NOT NULL,
  duration_seconds INT,
  tts_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Conversation outcomes table
CREATE TABLE public.conversation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES suggestions(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('match', 'date', 'ongoing', 'no_response', 'unmatched')),
  response_time_minutes INT,
  match_response TEXT,
  success_factors TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Image verifications table (anti-catfish)
CREATE TABLE public.image_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  perceptual_hash TEXT,
  reverse_search_results JSONB,
  risk_score NUMERIC(3,2) CHECK (risk_score BETWEEN 0 AND 1),
  risk_factors TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'pro', 'premium', 'lifetime')),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  features JSONB DEFAULT '{
    "conversations_per_day": 5,
    "suggestions_per_conversation": 3,
    "voice_notes": false,
    "coach_mode": false,
    "anti_catfish": false,
    "custom_personality": false
  }'::jsonb NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INT DEFAULT 0 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint, window_start)
);

-- Privacy logs table
CREATE TABLE public.privacy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('data_export', 'data_deletion', 'consent_given', 'consent_revoked')),
  entity_type TEXT,
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================
-- INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX idx_suggestions_conversation ON suggestions(conversation_id);
CREATE INDEX idx_suggestions_accepted ON suggestions(accepted) WHERE accepted = true;
CREATE INDEX idx_conversation_outcomes_outcome ON conversation_outcomes(outcome) WHERE outcome IN ('match', 'date');
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint, window_start DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users_own_profiles" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "users_own_conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- Suggestions policies (access via conversation ownership)
CREATE POLICY "owner_via_conversation" ON public.suggestions
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM conversations WHERE id = conversation_id
  ));

-- Voice notes policies
CREATE POLICY "users_own_voice_notes" ON public.voice_notes
  FOR ALL USING (auth.uid() = user_id);

-- Conversation outcomes policies
CREATE POLICY "owner_via_conversation_outcomes" ON public.conversation_outcomes
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM conversations WHERE id = conversation_id
  ));

-- Image verifications policies
CREATE POLICY "users_own_image_verifications" ON public.image_verifications
  FOR ALL USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "users_own_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Rate limits policies (read-only for users)
CREATE POLICY "users_view_own_rate_limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Privacy logs policies (read-only for users)
CREATE POLICY "users_view_own_privacy_logs" ON public.privacy_logs
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS & POLICIES
-- =============================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('screenshots', 'screenshots', false),
  ('voice-notes', 'voice-notes', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Screenshots bucket policies (private, user folders)
CREATE POLICY "screenshot_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "screenshot_select_own_folder" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "screenshot_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Voice notes bucket policies (private, user folders)
CREATE POLICY "voice_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-notes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "voice_select_own_folder" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-notes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "voice_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-notes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket policies (public read)
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- FUNCTIONS FOR FUTURE USE
-- =============================================

-- Function to clean up old data (privacy compliance)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete conversations older than 30 days
  DELETE FROM conversations 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete voice notes older than 30 days
  DELETE FROM voice_notes 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete privacy logs older than 2 years (legal requirement)
  DELETE FROM privacy_logs 
  WHERE created_at < now() - interval '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user plan features
CREATE OR REPLACE FUNCTION public.get_user_features(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_features JSONB;
BEGIN
  SELECT features INTO user_features
  FROM subscriptions
  WHERE user_id = user_uuid AND status = 'active';
  
  -- Return default free plan if no subscription found
  IF user_features IS NULL THEN
    RETURN '{
      "conversations_per_day": 5,
      "suggestions_per_conversation": 3,
      "voice_notes": false,
      "coach_mode": false,
      "anti_catfish": false,
      "custom_personality": false
    }'::jsonb;
  END IF;
  
  RETURN user_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA
-- =============================================

-- No initial data needed for production