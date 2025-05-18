# How-To: Handle Streaming Events in a UI

The ART Framework is designed to support real-time streaming of Large Language Model (LLM) responses and agent observations to a User Interface (UI). This is achieved through specialized "sockets" provided by the `UISystem`. This guide outlines how a hypothetical UI (client-side JavaScript) could subscribe to these sockets and display updates.

**Assumptions:**

*   You have an ART backend running, and your UI can communicate with it (e.g., via WebSockets, Server-Sent Events, or another mechanism that allows the backend to push data to the frontend).
*   The frontend has a way to get references to or emulate the `subscribe` methods of ART's UI sockets (`LLMStreamSocket`, `ObservationSocket`, `ConversationSocket`). For this guide, we'll assume a conceptual `artSockets` object on the client-side that provides this.

## Key Sockets for UI Updates

1.  **`LLMStreamSocket`:** For `StreamEvent`s (`TOKEN`, `METADATA`, `ERROR`, `END`) from LLM calls.
    *   Used to display LLM responses token by token.
    *   Can also show metadata or errors related to the LLM call.
2.  **`ObservationSocket`:** For `Observation` objects recorded by the agent.
    *   Used to display the agent's "thought process," tool usage, errors, etc.
3.  **`ConversationSocket`:** For new `ConversationMessage`s added to a thread.
    *   Used to update the chat history display.

## 1. Subscribing to `LLMStreamSocket` for Token Streaming

This is essential for showing the AI's response as it's being generated.

```html
<!-- Hypothetical HTML -->
<div id="chat-area">
    <!-- Messages will go here -->
</div>
<div id="current-ai-response"></div>
<div id="llm-status"></div>
```

```javascript
// Hypothetical client-side JavaScript

// Assume 'artSockets.llmStream' is your client-side interface to LLMStreamSocket
// and 'currentAgentInteraction' holds { threadId, traceId, sessionId }

const aiResponseElement = document.getElementById('current-ai-response');
const llmStatusElement = document.getElementById('llm-status');
let llmUnsubscribe = null;

function subscribeToLLMStream(threadId, sessionId) {
    if (llmUnsubscribe) llmUnsubscribe(); // Unsubscribe from previous if any

    aiResponseElement.innerHTML = ''; // Clear previous response
    llmStatusElement.textContent = 'Agent is thinking...';

    llmUnsubscribe = artSockets.llmStream.subscribe(
        (event) => { // Callback function for each StreamEvent
            if (event.threadId !== threadId) return; // Ensure event is for current thread

            switch (event.type) {
                case 'TOKEN':
                    // Only display tokens intended as the final response
                    if (event.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || event.tokenType === 'LLM_RESPONSE') {
                        const tokenSpan = document.createElement('span');
                        tokenSpan.textContent = event.data;
                        aiResponseElement.appendChild(tokenSpan);
                    } else if (event.tokenType && event.tokenType.includes('THOUGHT')) {
                        // Optionally display "thinking" tokens differently or log them
                        console.debug('LLM Thought Token:', event.data);
                        // llmStatusElement.textContent = `Agent thinking: ${event.data.substring(0,30)}...`;
                    }
                    break;
                case 'METADATA':
                    console.log('LLM Metadata:', event.data);
                    llmStatusElement.textContent = `LLM call finished. Stop reason: ${event.data.stopReason || 'N/A'}`;
                    break;
                case 'ERROR':
                    console.error('LLM Stream Error:', event.data);
                    const errorText = event.data?.message || String(event.data);
                    aiResponseElement.innerHTML += `<p class="error-message">LLM Error: ${errorText}</p>`;
                    llmStatusElement.textContent = 'Error during LLM call.';
                    break;
                case 'END':
                    console.log('LLM Stream ended.');
                    if (llmStatusElement.textContent === 'Agent is thinking...') { // If no metadata/error set it
                        llmStatusElement.textContent = 'Done.';
                    }
                    // Final response is now in aiResponseElement.
                    // You might move it to the main chat area here.
                    break;
            }
        },
        // Filter: We want all event types to handle them appropriately
        ['TOKEN', 'METADATA', 'ERROR', 'END'],
        // Options: Filter by threadId and potentially sessionId
        { threadId: threadId, sessionId: sessionId }
    );
}

// When a new agent interaction starts that involves an LLM call for synthesis:
// const currentThreadId = "thread-123";
// const currentSessionId = "session-abc"; // If you use session IDs
// subscribeToLLMStream(currentThreadId, currentSessionId);

// Remember to call llmUnsubscribe() when the component/view is destroyed
// or when you no longer need to listen for this specific stream.
// e.g., window.addEventListener('beforeunload', () => { if(llmUnsubscribe) llmUnsubscribe(); });
```

## 2. Subscribing to `ObservationSocket` for Agent Activity

This allows the UI to display what the agent is doing internally (planning, using tools).

```html
<!-- Hypothetical HTML -->
<ul id="agent-activity-log"></ul>
```

```javascript
// Hypothetical client-side JavaScript

// Assume 'artSockets.observation' is your client-side interface to ObservationSocket

const activityLogElement = document.getElementById('agent-activity-log');
let observationUnsubscribe = null;

function subscribeToObservations(threadId) {
    if (observationUnsubscribe) observationUnsubscribe();

    observationUnsubscribe = artSockets.observation.subscribe(
        (observation) => {
            if (observation.threadId !== threadId) return;

            const logEntry = document.createElement('li');
            logEntry.className = `log-entry log-type-${observation.type.toLowerCase()}`;

            let contentDisplay = JSON.stringify(observation.content);
            if (typeof observation.content === 'string') {
                contentDisplay = observation.content;
            } else if (observation.content && typeof observation.content.message === 'string') {
                contentDisplay = observation.content.message; // For simple message content
            }


            logEntry.innerHTML = `
                <strong>${observation.title}</strong> (Type: ${observation.type})<br>
                <small>Content: ${contentDisplay.substring(0, 100)}${contentDisplay.length > 100 ? '...' : ''}</small><br>
                <small>Time: ${new Date(observation.timestamp).toLocaleTimeString()}</small>
            `;
            activityLogElement.prepend(logEntry); // Add new entries to the top
        },
        // Filter: Subscribe to specific observation types you want to display
        [
            'INTENT',
            'PLAN',
            'TOOL_CALL',
            'TOOL_EXECUTION',
            'SYNTHESIS',
            'ERROR',
            'LLM_STREAM_START', // To show when LLM calls begin
            'LLM_STREAM_END'    // To show when LLM calls end
        ],
        // Options: Filter by threadId
        { threadId: threadId }
    );
}

// When a new agent interaction starts or a thread view is loaded:
// const currentThreadId = "thread-123";
// subscribeToObservations(currentThreadId);

// Call observationUnsubscribe() on cleanup.
```

## 3. Subscribing to `ConversationSocket` for Chat History

This updates the main chat display with new messages from both the user and the AI.

```html
<!-- Hypothetical HTML (chat-area from LLM example can be reused) -->
<!-- <div id="chat-area"></div> -->
```

```javascript
// Hypothetical client-side JavaScript

// Assume 'artSockets.conversation' is your client-side interface to ConversationSocket
// Assume 'chatAreaElement' is already defined (e.g., document.getElementById('chat-area'))

let conversationUnsubscribe = null;

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', message.role.toLowerCase()); // e.g., 'message user', 'message ai'
    messageDiv.innerHTML = `
        <span class="role">${message.role}</span>
        <p class="content">${message.content}</p>
        <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
    `;
    chatAreaElement.appendChild(messageDiv);
    chatAreaElement.scrollTop = chatAreaElement.scrollHeight; // Scroll to bottom
}

async function loadAndSubscribeToConversation(threadId) {
    if (conversationUnsubscribe) conversationUnsubscribe();
    chatAreaElement.innerHTML = ''; // Clear previous messages

    // Load initial history (optional)
    try {
        const history = await artSockets.conversation.getHistory(
            undefined, // No role filter, get all messages
            { threadId: threadId, limit: 50 } // Load last 50 messages
        );
        history.forEach(displayMessage);
    } catch (e) {
        console.error("Failed to load conversation history:", e);
    }

    // Subscribe to new messages
    conversationUnsubscribe = artSockets.conversation.subscribe(
        (message) => {
            if (message.threadId !== threadId) return;
            displayMessage(message);
        },
        undefined, // No role filter, receive all messages for the thread
        { threadId: threadId }
    );
}

// When a chat thread is opened/selected in the UI:
// const currentThreadId = "thread-123";
// loadAndSubscribeToConversation(currentThreadId);

// Call conversationUnsubscribe() on cleanup.
```

## Important Considerations:

*   **Client-Side Socket Interface (`artSockets`):** The `artSockets` object in these examples is conceptual. You'll need to implement the actual communication layer (e.g., using WebSockets, Server-Sent Events with a library like `EventSource`, or a state management library like Redux/ Zustand that syncs with the backend) to bridge events from your ART backend to your frontend.
*   **Error Handling and Resilience:** Add robust error handling for socket connections and event processing in your UI.
*   **Unsubscribing:** Always call the `unsubscribe` function returned by `subscribe()` when a UI component is destroyed or no longer needs to listen for events. This prevents memory leaks and unintended behavior.
*   **Filtering:** Leverage the `filter` and `options` parameters in `subscribe()` to minimize the amount of data sent to the client and reduce unnecessary UI updates.
*   **State Management:** For complex UIs, consider using a frontend state management library (Redux, Zustand, Vuex, etc.) to manage the data received from the sockets and drive UI rendering. The socket callbacks would dispatch actions to update the store.
*   **Security:** If your application involves multiple users or sensitive data, ensure your real-time communication channel is secured (e.g., WSS for WebSockets, HTTPS for SSE) and that events are correctly scoped by `threadId` and potentially `userId` or `sessionId` on the backend before broadcasting.

By subscribing to these sockets, you can create a rich, interactive, and informative user experience for your ART-powered agents.