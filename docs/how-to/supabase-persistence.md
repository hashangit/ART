# Using Supabase for Persistence in ART Framework

## Introduction

The ART framework provides a flexible storage system that allows developers to choose the persistence mechanism that best fits their application's needs. One of the available storage adapters is the `SupabaseStorageAdapter`, which enables you to use Supabase as a backend storage solution for your ART applications.

Supabase is an open-source Firebase alternative that provides a PostgreSQL database with real-time capabilities, authentication, and auto-generated APIs. By using the `SupabaseStorageAdapter`, you can leverage Supabase's powerful features while maintaining the flexibility and structure of the ART framework.

## SupabaseStorageAdapter Features

The `SupabaseStorageAdapter` implements the `StorageAdapter` interface and provides the following features:

1. **Persistent Storage**: Data is stored in a Supabase PostgreSQL database, ensuring persistence across sessions and devices.
2. **Collection Mapping**: Maps ART collections (conversations, observations, state, a2a_tasks) to Supabase tables.
3. **CRUD Operations**: Supports Create, Read, Update, and Delete operations for stored data.
4. **Query Capabilities**: Implements basic equality filters, limit/skip pagination, and single-key sorting.
5. **Flexible Configuration**: Allows customization of table names, schema, and Supabase client configuration.

## Configuration Options

To use the `SupabaseStorageAdapter`, you need to provide a configuration object that implements the `SupabaseConfig` interface:

```typescript
interface SupabaseConfig {
  /** Supabase project URL, e.g., https://xyzcompany.supabase.co */
  url: string;
  /** Supabase anon or service key. Prefer service key on server-side only. */
  apiKey: string;
  /** Optional schema name (default 'public'). */
  schema?: string;
  /**
   * Table names to use. These map ART collections to Supabase.
   * If you customize collection names in repositories, adjust accordingly.
   */
  tables?: {
    conversations?: string;
    observations?: string;
    state?: string;
    a2a_tasks?: string;
  };
  /**
   * Optional: pass a pre-initialized Supabase client (from @supabase/supabase-js)
   * Useful in environments where you already manage the client and auth.
   */
  client?: any;
}
```

## Integration with ART Framework

The `SupabaseStorageAdapter` integrates seamlessly with the ART framework through the repository pattern. The framework uses repositories to manage data access, and these repositories can work with any storage adapter that implements the `StorageAdapter` interface.

When you configure the ART framework to use the `SupabaseStorageAdapter`, the following repositories will automatically use Supabase for persistence:

1. `ConversationRepository` - Manages conversation history
2. `ObservationRepository` - Manages agent observations
3. `StateRepository` - Manages thread configuration and agent state
4. `TaskStatusRepository` - Manages A2A tasks

## Comparison with Other Storage Adapters

The ART framework provides three built-in storage adapters:

| Feature | InMemoryStorageAdapter | IndexedDBStorageAdapter | SupabaseStorageAdapter |
|---------|------------------------|-------------------------|------------------------|
| Persistence | No (data lost on refresh) | Yes (client-side) | Yes (server-side) |
| Data Location | Browser memory | Browser storage | Supabase PostgreSQL DB |
| Cross-Device Sync | No | No | Yes |
| Real-time Capabilities | No | No | Yes (with Supabase) |
| Scalability | Limited | Limited | High |
| Setup Complexity | Low | Medium | Medium-High |
| Best For | Testing, demos | Web apps | Production apps, collaboration |

## Usage Examples

### Basic Setup

To use the `SupabaseStorageAdapter` in your ART application, you need to create an instance of it and pass it to the `createArtInstance` function:

```typescript
import { createArtInstance } from '@art-framework/core';
import { SupabaseStorageAdapter } from '@art-framework/integrations/storage/supabase';
import { CalculatorTool } from '@art-framework/tools';

// Create the Supabase storage adapter
const supabaseStorage = new SupabaseStorageAdapter({
  url: 'https://your-project.supabase.co',
  apiKey: 'your-supabase-api-key',
  schema: 'public', // Optional
  tables: { // Optional custom table names
    conversations: 'chat_messages',
    observations: 'agent_observations',
    state: 'thread_states',
    a2a_tasks: 'agent_tasks'
  }
});

// Create the ART instance with Supabase storage
const art = await createArtInstance({
  storage: supabaseStorage,
  providers: {
    // Your provider configuration
  },
  tools: [
    new CalculatorTool()
  ]
});

// Use the ART instance
const response = await art.process({
  query: "What is 2+2?",
  threadId: "thread-123"
});
```

### Using a Pre-initialized Supabase Client

If you already have a Supabase client in your application, you can pass it to the adapter:

```typescript
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from '@art-framework/integrations/storage/supabase';

// Create your own Supabase client
const supabaseClient = createClient(
  'https://your-project.supabase.co',
  'your-supabase-api-key'
);

// Pass the pre-initialized client to the adapter
const supabaseStorage = new SupabaseStorageAdapter({
  url: 'https://your-project.supabase.co',
  apiKey: 'your-supabase-api-key',
  client: supabaseClient
});
```

### Custom Table Configuration

You can customize the table names used by the adapter to match your existing database schema:

```typescript
const supabaseStorage = new SupabaseStorageAdapter({
  url: 'https://your-project.supabase.co',
  apiKey: 'your-supabase-api-key',
  tables: {
    conversations: 'user_conversations',
    observations: 'agent_logs',
    state: 'session_states',
    a2a_tasks: 'distributed_tasks'
  }
});
```

## Required Database Schema

To use the `SupabaseStorageAdapter`, you need to create the following tables in your Supabase database:

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  threadId TEXT,
  messageId TEXT,
  role TEXT,
  content TEXT,
  timestamp BIGINT,
  metadata JSONB
);

-- Observations table
CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  threadId TEXT,
  traceId TEXT,
  timestamp BIGINT,
  type TEXT,
  title TEXT,
  content JSONB,
  metadata JSONB
);

-- State table
CREATE TABLE state (
  id TEXT PRIMARY KEY,
  config JSONB,
  state JSONB
);

-- A2A Tasks table
CREATE TABLE a2a_tasks (
  id TEXT PRIMARY KEY,
  taskId TEXT,
  threadId TEXT,
  status TEXT,
  payload JSONB,
  sourceAgent JSONB,
  targetAgent JSONB,
  priority TEXT,
  metadata JSONB,
  result JSONB,
  callbackUrl TEXT,
  dependencies TEXT[]
);
```

## Best Practices

1. **Use Service Keys Carefully**: When using Supabase service keys, ensure they are only used on the server-side to avoid exposing them to clients.

2. **Optimize Queries**: While the adapter implements basic filtering, for complex queries you might want to extend it or use Supabase's RPC functions.

3. **Handle Network Failures**: Implement retry logic for critical operations to handle temporary network issues.

4. **Secure Your Data**: Use Supabase's Row Level Security (RLS) policies to control access to your data.

5. **Monitor Performance**: Keep an eye on query performance, especially for large datasets, and consider adding indexes to your tables.

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your Supabase URL and API key are correct. For client-side applications, use the anon key rather than the service key.

2. **Table Not Found**: Verify that all required tables exist in your Supabase database and match the expected schema.

3. **Network Issues**: Check your internet connection and ensure your Supabase project is accessible.

4. **Rate Limiting**: If you're making many requests, you might hit Supabase's rate limits. Implement appropriate throttling.

### Debugging Tips

1. **Enable Logging**: The adapter uses the ART framework's logging system. Enable debug logging to see detailed information about database operations.

2. **Check Supabase Dashboard**: Use the Supabase dashboard to monitor database queries and identify potential performance issues.

3. **Verify Configuration**: Double-check your Supabase configuration, especially the URL and API key.

## Conclusion

The `SupabaseStorageAdapter` provides a powerful and flexible way to add persistent storage to your ART applications. By leveraging Supabase's PostgreSQL database and real-time capabilities, you can build robust, scalable applications that maintain state across sessions and devices.

With its simple configuration and seamless integration with the ART framework's repository pattern, the `SupabaseStorageAdapter` is an excellent choice for production applications that require reliable data persistence.