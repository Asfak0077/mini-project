-- =========================================================================
-- CAMPUSRESOLVE — SUPABASE NOTIFICATIONS RLS SECURITY MIGRATION
-- Enables Row Level Security (RLS) on public.notifications table
-- Fixes Supabase Security Advisor warning: "RLS Disabled in Public"
-- =========================================================================

-- 1. Enable Row Level Security (RLS) on public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing policies on public.notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- 3. SELECT POLICY: Authenticated users can read ONLY their own notifications
-- Ownership column used: user_id
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  OR user_id = (auth.jwt() ->> 'email')
  OR user_id = (auth.jwt() ->> 'sub')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'studentId')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'teacherId')
  OR (auth.jwt() ->> 'role' = 'admin')
  OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- 4. UPDATE POLICY: Users can update (mark read) ONLY their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  OR user_id = (auth.jwt() ->> 'email')
  OR user_id = (auth.jwt() ->> 'sub')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'studentId')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'teacherId')
)
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id = (auth.jwt() ->> 'email')
  OR user_id = (auth.jwt() ->> 'sub')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'studentId')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'teacherId')
);

-- 5. DELETE POLICY: Users can delete ONLY their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  OR user_id = (auth.jwt() ->> 'email')
  OR user_id = (auth.jwt() ->> 'sub')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'studentId')
  OR user_id = (auth.jwt() -> 'user_metadata' ->> 'teacherId')
);

-- 6. INSERT POLICY: Secure creation matching logged-in user or admin
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id = (auth.jwt() ->> 'email')
  OR user_id = (auth.jwt() ->> 'sub')
  OR (auth.jwt() ->> 'role' = 'admin')
  OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);
