# Deep Dive: `ObservationRepository`

The `ObservationRepository` is a component of ART's Context System, dedicated to persisting and retrieving `Observation` objects. It implements the `IObservationRepository` interface and, like other repositories, utilizes an injected `StorageAdapter` for the actual storage operations.

*   **Source:** `src/systems/context/repositories/ObservationRepository.ts`
*   **Implements:** `IObservationRepository` from `src/core/interfaces.ts`
*   **Dependencies:** `StorageAdapter`.

## Constructor

```typescript
constructor(storageAdapter: StorageAdapter)
```

*   `storageAdapter`: An instance of a class that implements the `StorageAdapter` interface. This adapter handles the underlying storage.
    *   The constructor throws an error if no `storageAdapter` is provided.
    *   It assumes the `storageAdapter` has been (or will be) initialized separately.

## Core Responsibilities & Methods

The `ObservationRepository` typically uses a collection named `"observations"` within the `StorageAdapter`. Since the `Observation` interface already includes an `id: string` property, this `id` is directly used as the key for storage, assuming the `StorageAdapter`'s object stores are configured with `{ keyPath: 'id' }`.

1.  **Adding an Observation:**
    *   **`async addObservation(observation: Observation): Promise<void>`**
        *   **Purpose:** To save a single `Observation` object to storage.
        *   **Process:**
            1.  Validates that the `observation` object has an `id` property. If not, it rejects the promise with an error.
            2.  Calls `this.adapter.set<Observation>(this.collectionName, observation.id, observation)`. This uses the `observation.id` as the key for the `set` operation. If an observation with the same ID already exists, it will be overwritten.
        *   **Error Handling:** Propagates errors from the `storageAdapter.set()` call.

2.  **Retrieving Observations:**
    *   **`async getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>`**
        *   **Purpose:** To fetch `Observation`s for a specific `threadId`, with optional filtering.
        *   **Process:**
            1.  **Initial Fetch:** Calls `this.adapter.query<Observation>(this.collectionName, { filter: { threadId: threadId } })`. This retrieves all observations from the `"observations"` collection where the `threadId` property matches.
            2.  **Client-Side Sorting:** The results are **sorted by `timestamp` in ascending order** (oldest first) to provide a chronological view.
            3.  **Client-Side Filtering (based on `ObservationFilter`):**
                *   **`filter.types?: ObservationType[]`:** If provided and not empty, it filters the observations to include only those whose `type` is present in the `filter.types` array.
                *   **`filter.beforeTimestamp?: number`:** If provided, observations with `timestamp >= filter.beforeTimestamp` are excluded.
                *   **`filter.afterTimestamp?: number`:** If provided, observations with `timestamp <= filter.afterTimestamp` are excluded.
            4.  **Limit/Skip:** The current `ObservationFilter` type and `ObservationRepository` implementation in `v0.2.7` do not directly support `limit` or `skip` options for observations in the same way `ConversationRepository` does for messages. If pagination or limiting is needed for observations, this would be a potential area for enhancement in the `ObservationFilter` type and this method's client-side processing logic or by pushing it to the `StorageAdapter` query.
        *   **Data Integrity:** The objects retrieved from storage should already conform to the `Observation` interface, so no structural transformation (like removing an internal `id` field) is typically needed before returning.
        *   **Error Handling:** Propagates errors from the `storageAdapter.query()` call.

## Usage

The `ObservationManager` uses the `ObservationRepository` to:

*   Persist new observations generated during an agent's execution cycle via `addObservation()`.
*   Retrieve historical observations (e.g., for display in a UI or for analysis) via `getObservations()`.

Like other repositories in ART, the `ObservationRepository` abstracts the details of data storage, allowing the `ObservationManager` to focus on the logic of handling observations without being tied to a specific storage backend.