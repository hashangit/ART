## Supabase Storage Adapter

The Supabase storage adapter provides a Postgres-backed implementation of the `StorageAdapter` interface, enabling ART to persist conversations, observations, thread state, and A2A tasks in Supabase.

### Installation

```bash
pnpm add @supabase/supabase-js
```

### Overview & Flow

- The adapter is selected via `ArtInstanceConfig.storage` by passing a `SupabaseStorageAdapter` instance.
- Repositories (`conversations`, `observations`, `state`, `a2a_tasks`) call `get/set/query/delete` on the adapter; the adapter translates to Supabase queries.
- See the repository data flow diagram in this docs set for end-to-end interactions.

### Schema

Create four tables with a primary key `id` (text or uuid). Minimal example (SQL):

```sql
-- conversations
create table if not exists conversations (
  id text primary key,
  messageId text not null,
  threadId text not null,
  role text not null,
  content text not null,
  timestamp bigint not null,
  metadata jsonb
);

-- observations
create table if not exists observations (
  id text primary key,
  threadId text not null,
  traceId text,
  timestamp bigint not null,
  type text not null,
  title text not null,
  content jsonb not null,
  metadata jsonb
);

-- state
create table if not exists state (
  id text primary key, -- equals threadId
  config jsonb not null,
  state jsonb
);

-- a2a_tasks
create table if not exists a2a_tasks (
  id text primary key, -- equals taskId
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

-- helpful indexes
create index if not exists idx_conv_thread on conversations(threadId);
create index if not exists idx_obs_thread on observations(threadId);
create index if not exists idx_tasks_thread on a2a_tasks(threadId);
```

Notes:
- ART repositories filter primarily by `threadId`; add additional indexes as needed.
- Use `uuid` type if preferred; ensure the adapter writes `id` values that match your type.

### Usage

```ts
import { SupabaseStorageAdapter, PESAgent, createArtInstance } from 'art';

const storage = new SupabaseStorageAdapter({
  url: process.env.SUPABASE_URL!,
  apiKey: process.env.SUPABASE_KEY!,
  schema: 'public',
  tables: {
    conversations: 'conversations',
    observations: 'observations',
    state: 'state',
    a2a_tasks: 'a2a_tasks',
  },
});

await storage.init();

const art = await createArtInstance({
  storage,
  providers: {/* ... */},
});
```

### Behavior & Compatibility

- Mirrors the semantics of `IndexedDBStorageAdapter`:
  - `get/set/delete` by `id`.
  - `query` supports equality filters, array `in` filters, single-key sort, skip/limit.
  - `clearCollection` and `clearAll` are provided.
- Repositories expect `id` to exist on stored rows; this adapter upserts by `id`.

### Security

- On the server, prefer using the service role key and row-level security (RLS) disabled where appropriate.
- In the browser, only use anon keys with strict RLS policies that allow access to the user’s own rows.


