# Deep Dive: `UISystem`

The `UISystem` is a straightforward but essential component in the ART Framework. Its primary purpose is to act as a centralized service that instantiates and provides access to the various specialized `TypedSocket` instances used for UI communication.

*   **Source:** `src/systems/ui/ui-system.ts`
*   **Implements:** `UISystem` interface from `src/core/interfaces.ts`
*   **Dependencies:** `IObservationRepository`, `IConversationRepository`.

## Constructor

```typescript
constructor(
    observationRepository: IObservationRepository,
    conversationRepository: IConversationRepository
)
```

*   `observationRepository: IObservationRepository`: An instance of `IObservationRepository`. This is passed directly to the constructor of the `ObservationSocket` instance that `UISystem` creates. It allows the `ObservationSocket` to fulfill `getHistory()` requests.
*   `conversationRepository: IConversationRepository`: An instance of `IConversationRepository`. This is passed directly to the constructor of the `ConversationSocket` instance, enabling its `getHistory()` functionality.

During construction, the `UISystem` performs the following:

1.  Instantiates `ObservationSocket`, providing it with the `observationRepository`.
2.  Instantiates `ConversationSocket`, providing it with the `conversationRepository`.
3.  Instantiates `LLMStreamSocket` (which currently has no constructor dependencies).
4.  Logs a debug message indicating successful initialization.

## Key Methods (Accessors for Sockets)

The `UISystem` provides getter methods to retrieve the singleton instances of the specialized sockets it manages:

1.  **`getObservationSocket(): ObservationSocket`**
    *   Returns the single instance of `ObservationSocket` created during `UISystem`'s construction.

2.  **`getConversationSocket(): ConversationSocket`**
    *   Returns the single instance of `ConversationSocket`.

3.  **`getLLMStreamSocket(): LLMStreamSocket`**
    *   Returns the single instance of `LLMStreamSocket`.

## Role in the Framework

*   **Centralized Access:** Instead of various components needing to know how to instantiate or locate individual sockets, they can simply get them from the `UISystem`.
*   **Dependency Injection:** The `UISystem` handles injecting necessary dependencies (like repositories) into the sockets that need them for historical data retrieval.
*   **Singleton Management:** Ensures that there's a single, shared instance of each type of UI communication socket throughout the application, simplifying event broadcasting and subscription management.

## Usage

1.  **Initialization:** An instance of `UISystemImpl` is created by the `AgentFactory` during the `createArtInstance` process. The necessary repository dependencies are injected at this time.
2.  **Access by `ArtInstance`:** The `ArtInstance` object returned by `createArtInstance` holds a reference to the `UISystem`, making it available to the application.
    ```typescript
    // const art = await createArtInstance(config);
    // const obsSocket = art.uiSystem.getObservationSocket();
    // const convSocket = art.uiSystem.getConversationSocket();
    // const llmStreamSocket = art.uiSystem.getLLMStreamSocket();
    ```
3.  **Usage by Internal ART Components:**
    *   **`PESAgent`:** Obtains the `LLMStreamSocket` from `UISystem` to notify `StreamEvent`s during LLM calls.
    *   **`ObservationManager`:** Obtains the `ObservationSocket` from `UISystem` (usually injected into `ObservationManager`) to notify new `Observation`s.
    *   **`ConversationManager`:** Obtains the `ConversationSocket` from `UISystem` (usually injected into `ConversationManager`) to notify new `ConversationMessage`s.
4.  **Usage by Application/UI Layer:**
    *   The application frontend or other services would typically get references to these sockets from the `artInstance.uiSystem` and then use their `subscribe()` methods to listen for relevant real-time updates. They might also use the `getHistory()` methods of `ObservationSocket` and `ConversationSocket` to load initial data.

The `UISystem` simplifies the management and accessibility of UI communication channels within the ART Framework.