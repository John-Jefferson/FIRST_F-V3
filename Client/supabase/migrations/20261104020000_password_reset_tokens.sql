-- ==========================================
-- Migration: Password Reset Tokens Table
-- File: 20261104020000_password_reset_tokens.sql
-- Description: Creates a secure token table for tracking
--              password reset requests with expiration and usage flags.
-- ==========================================

begin;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.password_reset_tokens enable row level security;

-- Lock down default permissions
revoke all on public.password_reset_tokens from public, anon, authenticated;

-- Allow system/service role or admins to manage tokens securely
grant select, insert, update on public.password_reset_tokens to authenticated;

-- Restrictive RLS policy matching your project structure
drop policy if exists hope_password_reset_admin_guard on public.password_reset_tokens;
create policy hope_password_reset_admin_guard
on public.password_reset_tokens for all to authenticated
using ((select public.hope_is_admin()))
with check ((select public.hope_is_admin()));

commit;
