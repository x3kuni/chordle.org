# Chordle account/profile deployment

This branch adds Supabase authentication plus Profile and Leaderboard integration without rewriting the large generated `public/index.html`.

## Supabase

1. Open Supabase -> SQL Editor.
2. Run `supabase/chordle_profiles_setup.sql` once.\n3. Run `supabase/chordle_rolls_setup.sql` once. This creates shared daily rolls, roll badges, badge ownership, score-awarding triggers, and the RLS policies used by the live leaderboard.\n4. After both scripts succeed, create/login through the Chordle UI rather than manually adding profile rows.
3. Open Authentication -> Users. Create/login through the Chordle UI rather than manually adding profile rows.
4. Open Table Editor -> `profiles`. A new Auth user should produce a row with the same UUID in `profiles.id`.
7. Confirm different accounts produce different rows.\n8. After an official roll completes, confirm a row appears in `daily_rolls`, badge rows appear in `daily_roll_badges`, and unique owned badges appear in `user_badges`.

Expected `profiles` columns:
- `id uuid`
- `username text`
- `name_color text`
- `lifetime_score int8`
- `joined_at timestamptz`

## Cloudflare

The Worker must run before static assets so it can inject `/auth.js` into the existing HTML. The required setting is already committed in `wrangler.jsonc`:

```json
"run_worker_first": true
```

If Cloudflare is connected to GitHub, pushes/PRs should trigger builds automatically.

## Test checklist

Use the Cloudflare preview for the pull request before merging:

1. Open Chordle preview.
2. Create Account A.
3. Confirm Account A appears in Supabase Authentication -> Users.
4. Confirm a matching row appears in `public.profiles`.
5. Open Profile: username, score, color, and joined date should load from Supabase.
6. Open Leaderboard: Account A should appear.
7. Log out.
8. Create Account B with a different email/username.
9. Confirm a second Auth user and a second profile row.
10. Open Leaderboard: both accounts should appear.
11. Log out/log into A and B; Profile should switch to the correct row every time.

Do not merge the PR until the preview passes this checklist.
