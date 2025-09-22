-- Fix security warnings: Function Search Path and Extension placement

-- Fix 1: Update set_updated_at function with secure search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Update cleanup_old_data function with secure search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: Update get_user_features function with secure search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;