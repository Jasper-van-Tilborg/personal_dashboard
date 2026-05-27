-- Personal Dashboard Schema
-- Run this in your Supabase SQL editor

-- Week Schedule
create table if not exists week_schedule (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  time_blocks jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique(user_id, day_of_week)
);

-- Workouts
create table if not exists workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  split_day text not null,
  notes text,
  social_media_minutes_earned integer default 45,
  created_at timestamptz default now()
);

-- Workout Exercises
create table if not exists workout_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts on delete cascade not null,
  exercise_name text not null,
  sets jsonb not null default '[]'::jsonb,
  order_index smallint default 0
);

-- Habits
create table if not exists habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text default '✅',
  frequency text not null default 'daily',
  social_media_minutes integer default 10,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Habit Completions
create table if not exists habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  completed_date date not null default current_date,
  created_at timestamptz default now(),
  unique(habit_id, completed_date)
);

-- Sleep Logs
create table if not exists sleep_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  sleep_time time not null,
  wake_time time not null,
  duration_minutes smallint,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Weight Logs
create table if not exists weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  weight_kg decimal(5, 2) not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Journal Entries
create table if not exists journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Social Media Transactions
create table if not exists social_media_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  source text not null,
  source_ref_id uuid,
  minutes integer not null,
  description text,
  created_at timestamptz default now()
);

-- Motivation Goals
create table if not exists motivation_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Spotify Tokens
create table if not exists spotify_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

-- =====================
-- Row Level Security
-- =====================

alter table week_schedule enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table habits enable row level security;
alter table habit_completions enable row level security;
alter table sleep_logs enable row level security;
alter table weight_logs enable row level security;
alter table journal_entries enable row level security;
alter table social_media_transactions enable row level security;
alter table motivation_goals enable row level security;
alter table spotify_tokens enable row level security;

create policy "own_week_schedule" on week_schedule for all using (auth.uid() = user_id);
create policy "own_workouts" on workouts for all using (auth.uid() = user_id);
create policy "own_workout_exercises" on workout_exercises for all
  using (exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid()));
create policy "own_habits" on habits for all using (auth.uid() = user_id);
create policy "own_habit_completions" on habit_completions for all using (auth.uid() = user_id);
create policy "own_sleep_logs" on sleep_logs for all using (auth.uid() = user_id);
create policy "own_weight_logs" on weight_logs for all using (auth.uid() = user_id);
create policy "own_journal_entries" on journal_entries for all using (auth.uid() = user_id);
create policy "own_social_media_transactions" on social_media_transactions for all using (auth.uid() = user_id);
create policy "own_motivation_goals" on motivation_goals for all using (auth.uid() = user_id);
create policy "own_spotify_tokens" on spotify_tokens for all using (auth.uid() = user_id);
