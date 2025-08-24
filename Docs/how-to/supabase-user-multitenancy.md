## Guide: Using ART with Supabase, Users, and Private Data (Beginner Friendly)

This guide shows how to set up ART with Supabase so each signed-in user has private conversation history, observations, state, and A2A tasks. It also explains how to store user API keys securely (separate from ART data).

### What you’ll build

- A Supabase project where users sign in
- Four ART data tables with Row Level Security (RLS) so users only see their own rows
- Optional secure table for storing user API keys
- An ART instance that uses the Supabase storage adapter and respects RLS

### Prerequisites

- Supabase account and project
- Node.js, pnpm/yarn/npm
- Basic TypeScript/JavaScript familiarity (we keep steps simple)

---

## 1) Create Supabase project and enable Auth

1. Create a project in Supabase Dashboard
2. In Authentication → Providers, enable the login method(s) you want (Email/Password, OAuth, etc.)
3. Note your project URL and anon key (for client-side) and service role key (for server-side)

---

## 2) Create ART tables with user_id + RLS

Run this SQL in the Supabase SQL Editor. It creates the four ART tables, adds a `user_id`, enables RLS, and creates helpful indexes.

```sql
-- conversations (chat messages)
create table if not exists conversations (
  id text primary key,
  user_id uuid not null,
  messageId text not null,
  threadId text not null,
  role text not null,
  content text not null,
  timestamp bigint not null,
  metadata jsonb
);

-- observations (agent events, planning, tool calls, etc.)
create table if not exists observations (
  id text primary key,
  user_id uuid not null,
  threadId text not null,
  traceId text,
  timestamp bigint not null,
  type text not null,
  title text not null,
  content jsonb not null,
  metadata jsonb
);

-- state (per-thread configuration and agent state)
create table if not exists state (
  id text primary key, -- equals threadId
  user_id uuid not null,
  config jsonb not null,
  state jsonb
);

-- a2a_tasks (delegation tasks)
create table if not exists a2a_tasks (
  id text primary key, -- equals taskId
  user_id uuid not null,
  threadId text not null,
  status text not null,
  payload jsonb not null,
  sourceAgent jsonb not null,
  targetAgent jsonb,
  priority text not null,
  metadata jsonb not null,
  result jsonb,
  callbackUrl text,
  dependencies jsonb
);

-- indexes for common queries
create index if not exists idx_conv_user_thread on conversations(user_id, threadId);
create index if not exists idx_obs_user_thread on observations(user_id, threadId);
create index if not exists idx_state_user on state(user_id);
create index if not exists idx_tasks_user_thread on a2a_tasks(user_id, threadId);

-- enable row level security
alter table conversations enable row level security;
alter table observations  enable row level security;
alter table state         enable row level security;
alter table a2a_tasks     enable row level security;

-- RLS policies: allow users to read/write only their rows
create policy if not exists conv_rw_own on conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists obs_rw_own on observations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists state_rw_own on state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists tasks_rw_own on a2a_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- optional: auto-set user_id from auth if omitted on insert
create or replace function set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger conversations_set_user_id before insert on conversations
for each row execute procedure set_user_id();
create trigger observations_set_user_id  before insert on observations
for each row execute procedure set_user_id();
create trigger state_set_user_id         before insert on state
for each row execute procedure set_user_id();
create trigger tasks_set_user_id         before insert on a2a_tasks
for each row execute procedure set_user_id();
```

Why this matters: RLS makes sure a logged-in user can only read/write rows where `user_id = auth.uid()`. The adapter doesn’t need to change—RLS enforces privacy.

---

## 3) Optional: secure user credentials table

Store API keys or auth tokens separately from ART data.

```sql
create table if not exists user_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_secret text not null,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table user_credentials enable row level security;
create policy if not exists creds_rw_own on user_credentials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Tip: Use Supabase Vault or a server-only KMS to encrypt/decrypt secrets.

---

## 4) Wire up Supabase Auth in your app

Client-side example (React/Vite):

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true } }
);

// Sign-in happens via supabase.auth.signInWithPassword(...) or OAuth methods
```

Once signed in, `supabase` carries the user’s JWT, so RLS will apply automatically for all queries.

---

## 5) Configure ART to use SupabaseStorageAdapter

```ts
import { SupabaseStorageAdapter, createArtInstance } from 'art';
import { supabase } from './supabaseClient';

const storage = new SupabaseStorageAdapter({ client: supabase });
await storage.init(); // no-op if client provided

const art = await createArtInstance({
  storage,
  providers: {/* your ProviderManager config */},
});

// Now calls like conversationManager.getMessages(threadId) are scoped by RLS
```

---

## 6) How it works (plain-English)

- ART repositories ask the adapter for data (e.g., “get messages for thread X”).
- The Supabase adapter runs a select on your tables. Because the user is signed in, Supabase RLS checks that the row’s `user_id` matches the current user.
- If user A tries to read user B’s rows, RLS blocks it. No app code changes needed.
- When you write (insert/update), RLS also checks `user_id`. The triggers can auto-fill it for you.

---

## 7) Sharing threads (optional)

To allow shared threads among multiple users:

```sql
create table if not exists thread_members (
  user_id uuid not null,
  threadId text not null,
  primary key (user_id, threadId)
);

alter table thread_members enable row level security;
create policy if not exists thread_members_rw_own on thread_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Then adjust RLS policies to allow access if a user is a member of the thread (e.g., add `exists` subqueries against `thread_members`).

---

## 8) Server-side patterns

- Service role (RLS bypass): good for migrations or admin jobs. Always set `user_id` explicitly so ownership stays correct.
- Acting as user: use a user JWT on the server (for user-scoped actions) so RLS still applies.

---

## 9) Troubleshooting

- “I see no rows” → Ensure you’re signed in and RLS policies exist. Check `user_id` is present in rows.
- “Writes fail” → RLS `with check` likely blocked the insert; ensure `user_id = auth.uid()` or triggers set it.
- “Performance issues” → Add indexes on `(user_id, threadId)`, and ensure your queries also filter by `threadId` where possible.

---

## 10) Quick checklist

- [ ] Tables created with `user_id`
- [ ] RLS enabled + policies added
- [ ] Indexes created on `(user_id, threadId)`
- [ ] App authenticates user and uses that Supabase client in the adapter
- [ ] Optional: credentials table with RLS for user secrets

You’re done! Your users’ ART data is now private per account, with clean support for multi-tenancy.


