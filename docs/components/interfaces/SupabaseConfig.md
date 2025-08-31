[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SupabaseConfig

# Interface: SupabaseConfig

Defined in: [src/integrations/storage/supabase.ts:5](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L5)

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [src/integrations/storage/supabase.ts:9](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L9)

Supabase anon or service key. Prefer service key on server-side only.

***

### client?

> `optional` **client**: `any`

Defined in: [src/integrations/storage/supabase.ts:26](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L26)

Optional: pass a pre-initialized Supabase client (from @supabase/supabase-js)
Useful in environments where you already manage the client and auth.

***

### schema?

> `optional` **schema**: `string`

Defined in: [src/integrations/storage/supabase.ts:11](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L11)

Optional schema name (default 'public').

***

### tables?

> `optional` **tables**: `object`

Defined in: [src/integrations/storage/supabase.ts:16](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L16)

Table names to use. These map ART collections to Supabase.
If you customize collection names in repositories, adjust accordingly.

#### a2a\_tasks?

> `optional` **a2a\_tasks**: `string`

#### conversations?

> `optional` **conversations**: `string`

#### observations?

> `optional` **observations**: `string`

#### state?

> `optional` **state**: `string`

***

### url

> **url**: `string`

Defined in: [src/integrations/storage/supabase.ts:7](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/supabase.ts#L7)

Supabase project URL, e.g., https://xyzcompany.supabase.co
