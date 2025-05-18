# Deep Dive: `TypedSocket`

The `TypedSocket<DataType, FilterType>` is a generic base class within ART's UI System. It provides the core functionality for a publish/subscribe mechanism, allowing different parts of the application (especially UI components) to receive real-time updates when specific data events occur. It's designed to be extended by more specialized sockets like `LLMStreamSocket`, `ObservationSocket`, and `ConversationSocket`.

*   **Source:** `src/systems/ui/typed-socket.ts`

## Purpose

*   **Decoupling:** Enables components that generate data (e.g., `ObservationManager`, `ConversationManager`, `PESAgent` for LLM streams) to notify interested parties without having direct dependencies on them.
*   **Real-time Updates:** Facilitates pushing data to subscribers as soon as it becomes available.
*   **Filtering:** Allows subscribers to specify criteria (a `FilterType` and `options` like `threadId`) to receive only relevant data.
*   **Type Safety:** Uses generics (`DataType`, `FilterType`) to provide type safety for the data being passed and the filters being applied.

## Generics

*   **`DataType`**: The type of data that will be broadcast through this socket (e.g., `StreamEvent`, `Observation`, `ConversationMessage`).
*   **`FilterType` (optional, defaults to `any`):** The type of the filter criteria that subscribers can use to narrow down the notifications they receive. For example, for `ObservationSocket`, `FilterType` is `ObservationType | ObservationType[]`.

## Constructor

```typescript
constructor()
```

*   The base `TypedSocket` constructor is simple and currently does not take any arguments. It initializes an internal `Map` to store subscriptions.

## Key Methods

1.  **`subscribe(callback: (data: DataType) => void, filter?: FilterType, options?: { threadId?: string }): UnsubscribeFunction`**
    *   **Purpose:** Allows a client (e.g., a UI component) to register interest in receiving data from this socket.
    *   **Parameters:**
        *   `callback: (data: DataType) => void`: The function that will be invoked when a matching data event is notified. It receives the `data` of type `DataType`.
        *   `filter?: FilterType`: (Optional) A filter specific to the `DataType` and the specialized socket implementation. For example, for `ObservationSocket`, this could be an `ObservationType`.
        *   `options?: { threadId?: string }`: (Optional) Currently supports a `threadId` to scope subscriptions to a particular conversation thread.
    *   **Process:**
        1.  Generates a unique ID for the subscription using `uuidv4()`.
        2.  Stores the `callback`, `filter`, and `options` in its internal `subscriptions` Map, keyed by the generated ID.
        3.  Logs that a new subscription has been added.
    *   **Return Value:** `UnsubscribeFunction` - A function that, when called, will remove this specific subscription from the socket. This is crucial for preventing memory leaks when a subscriber is no longer interested or is destroyed.

2.  **`notify(data: DataType, options?: { targetThreadId?: string; targetSessionId?: string }, filterCheck?: (data: DataType, filter?: FilterType) => boolean): void`**
    *   **Purpose:** Called by data producers to broadcast `data` to all relevant subscribers.
    *   **Parameters:**
        *   `data: DataType`: The data payload to send.
        *   `options?: { targetThreadId?: string; targetSessionId?: string }`: (Optional) Targeting options for the notification.
            *   `targetThreadId`: If provided, only subscribers whose `options.threadId` matches this (or subscribers with no `threadId` filter) will be considered.
            *   `targetSessionId`: (Placeholder for future use) Could be used to target specific UI sessions.
        *   `filterCheck?: (data: DataType, filter?: FilterType) => boolean`: (Optional) A function provided by the specialized socket (like `LLMStreamSocket.notifyStreamEvent`) that knows how to evaluate if the `data` matches a subscriber's specific `filter` (of `FilterType`).
    *   **Process:**
        1.  Logs the notify attempt, including the type of socket and number of current subscriptions.
        2.  Iterates through all active `subscriptions`.
        3.  For each subscription:
            *   **Thread ID Check:** If the subscription has `sub.options.threadId` and the notification has `options.targetThreadId`, it checks if they match. If they don't, this subscriber is skipped.
            *   **Custom Filter Check:** If a `filterCheck` function is provided and the subscription has a `sub.filter`, it calls `filterCheck(data, sub.filter)`. If this returns `false`, this subscriber is skipped.
            *   If all checks pass, the `sub.callback(data)` is invoked.
            *   Catches and logs any errors thrown by a subscriber's callback function but continues notifying other subscribers.

3.  **`async getHistory?(_filter?: FilterType, _options?: { threadId?: string; limit?: number }): Promise<DataType[]>` (Optional Method)**
    *   **Purpose:** Intended as a hook for specialized sockets to provide a way to fetch historical data.
    *   **Base Implementation:** The base `TypedSocket` implementation logs a warning ("getHistory is not implemented...") and returns `Promise.resolve([])`.
    *   **Override in Subclasses:** Specialized sockets like `ObservationSocket` and `ConversationSocket` override this method to interact with their respective repositories if configured. `LLMStreamSocket` does not override it as stream events are typically transient.

4.  **`clearAllSubscriptions(): void`**
    *   **Purpose:** Removes all current subscriptions from the socket.
    *   Useful for cleanup, especially during testing or application shutdown/reset.

## Extending `TypedSocket`

Specialized sockets like `LLMStreamSocket`, `ObservationSocket`, and `ConversationSocket` extend `TypedSocket` by:

1.  Specifying the `DataType` and `FilterType` generics.
2.  Often providing a more specific `notify<SpecificName>(data: DataType)` method (e.g., `notifyStreamEvent`, `notifyObservation`) that internally calls `super.notify()` with the appropriate `filterCheck` function tailored to their `DataType` and `FilterType`.
3.  Optionally overriding `getHistory()` if they have a backing repository to fetch historical data from.

`TypedSocket` provides a robust and reusable foundation for event-driven communication within the ART Framework, particularly for UI updates.