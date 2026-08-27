-- Public profile fields for the scoreboard.
-- Run this once in Supabase → SQL Editor to let people open each other's profile cards
-- (name, level, title, badge, avatar, streak, Life Rating, achievement count) from the
-- scoreboard. Everything is best-effort: without these columns the daily/weekly scoreboard
-- still works, people just can't open profile cards.
--
-- Only rows with is_public = true are openable by others (the app sets this from the
-- "Public profile" toggle on the /profile page). RLS on the leaderboard table already limits
-- reads to people who share a league with you or who opted into the global board.

alter table leaderboard
  add column if not exists avatar text,
  add column if not exists title text,
  add column if not exists badge text,
  add column if not exists level int,
  add column if not exists elo int,
  add column if not exists streak int,
  add column if not exists achievements int,
  add column if not exists is_public boolean default false;
