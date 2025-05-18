# Example: Persistent Agent (using IndexedDB)

This example demonstrates how to configure an ART agent to use `IndexedDBStorageAdapter`. This allows conversation history and agent state (if managed) to persist across browser sessions, making the agent "remember" past interactions within the same thread.

**Note:** This example is intended to be run in a browser environment where IndexedDB is available.

## 1. Project Setup

*   Ensure you have [installed ART Framework](installation.md).
*   If you're setting up a new project for the browser, you might use a bundler like Vite, Parcel, or Webpack. For simplicity, this example can be adapted into a single HTML file with a `<script type="module">`.

## 2. HTML File (Example: `persistent-agent.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ART Persistent Agent Example</title>
    <style>
        body { font-family: sans-serif; margin: 20px; }
        #chatLog { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; margin-bottom: 10px; }
        .message { margin-bottom: 8px; padding: 5px; border-radius: 4px; }
        .user { background-color: #e1f5fe; text-align: right; margin-left: 20%; }
        .ai { background-color: #f0f0f0; margin-right: 20%; }
        input[type="text"] { width: calc(100% - 80px); padding: 8px; }
        button { padding: 8px 15px; }
    </style>
</head>
<body>
    <h1>ART Persistent Agent (IndexedDB)</h1>
    <div id="chatLog"></div>
    <input type="text" id="userInput" placeholder="Type your message...">
    <button id="sendButton">Send</button>
    <p><small>Open browser console (F12) to see ART Framework logs.</small></p>
    <p><small>Refresh the page to see if history persists for the current thread.</small></p>

    <script type="module">
        // ART Framework code will go here (see Step 3)
    </script>
</body>
</html>
```

## 3. JavaScript Code (within `<script type="module">`)

Replace the `// ART Framework code will go here` comment in the HTML with the following:

```javascript
// Inside <script type="module"> in persistent-agent.html

import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    OpenAIAdapter, // Using OpenAI for this example
    MessageRole
} from './node_modules/art-framework/dist/esm/index.js'; // Adjust path if ART is installed differently or bundled

// --- Configuration ---
const OPENAI_API_KEY = prompt("Please enter your OpenAI API Key:", ""); // Simple prompt for demo; use secure methods in real apps!

if (!OPENAI_API_KEY) {
    alert("OpenAI API Key is required to run this demo.");
    throw new Error("OpenAI API Key not provided.");
}

const artConfig = {
    storage: {
        type: 'indexedDB',
        dbName: 'MyPersistentAgentDB_ART', // Unique name for your app's DB
        dbVersion: 1, // Increment if you change object store structures (not an issue here)
        // Default objectStores ('conversations', 'observations', 'state') are fine
    },
    providers: {
        availableProviders: [
            {
                name: 'openai-chat',
                adapter: OpenAIAdapter,
                isLocal: false,
            }
        ],
    },
    logger: {
        level: LogLevel.INFO, // Set to DEBUG for more details
    },
    stateSavingStrategy: 'implicit' // Useful if agent needs to remember preferences
};

// --- UI Elements ---
const chatLog = document.getElementById('chatLog');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

let artInstance; // To store the initialized ART instance
const threadId = "persistent-thread-example-001"; // Fixed threadId for this demo
const userId = "web-user-001";

// Function to add a message to the chat log UI
function appendMessageToLog(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role.toLowerCase());
    messageDiv.textContent = `${role.toUpperCase()}: ${content}`;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Function to initialize ART and load history
async function initializeAgent() {
    try {
        artInstance = await createArtInstance(artConfig);
        console.log("ART Instance with IndexedDB initialized.");
        appendMessageToLog("SYSTEM", "Agent initialized. History (if any) should be loaded.");

        // Load and display existing messages for this thread
        const history = await artInstance.conversationManager.getMessages(threadId, { limit: 50 });
        if (history && history.length > 0) {
            appendMessageToLog("SYSTEM", `--- Loaded ${history.length} previous messages ---`);
            history.forEach(msg => appendMessageToLog(msg.role, msg.content));
        } else {
            appendMessageToLog("SYSTEM", "No previous messages found for this thread.");
        }

    } catch (error) {
        console.error("Failed to initialize ART Instance:", error);
        appendMessageToLog("SYSTEM", `Error initializing agent: ${error.message}`);
    }
}

// Function to handle sending a message
async function sendMessage() {
    if (!artInstance) {
        appendMessageToLog("SYSTEM", "Agent not initialized yet.");
        return;
    }
    const query = userInput.value.trim();
    if (!query) return;

    appendMessageToLog(MessageRole.USER, query);
    userInput.value = ''; // Clear input
    userInput.disabled = true;
    sendButton.disabled = true;
    appendMessageToLog("SYSTEM", "Agent is processing...");


    const agentProps = {
        query,
        threadId,
        userId,
        options: {
            providerConfig: {
                providerName: 'openai-chat',
                modelId: 'gpt-3.5-turbo',
                adapterOptions: { apiKey: OPENAI_API_KEY }
            },
            stream: true // Enable streaming for better UX
        }
    };

    try {
        // We will handle stream events directly for UI updates
        const stream = await artInstance.process(agentProps); // process now returns the stream
        
        let currentAiMessageContent = "";
        let aiMessageElement = null;

        for await (const event of stream) {
            // Also notify the ART's internal LLMStreamSocket if other components subscribe to it
            artInstance.uiSystem.getLLMStreamSocket().notify(event, { targetThreadId: threadId });

            if (event.type === 'TOKEN' && (event.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || event.tokenType === 'LLM_RESPONSE')) {
                if (!aiMessageElement) {
                    // Create AI message div on first token
                    aiMessageElement = document.createElement('div');
                    aiMessageElement.classList.add('message', 'ai');
                    chatLog.appendChild(aiMessageElement);
                }
                currentAiMessageContent += event.data;
                aiMessageElement.textContent = `AI: ${currentAiMessageContent}`; // Update incrementally
                chatLog.scrollTop = chatLog.scrollHeight;
            } else if (event.type === 'METADATA') {
                console.log("Agent Execution Metadata:", event.data);
                // The final response content is built from tokens.
                // The ConversationMessage is saved by PESAgent after stream completion.
            } else if (event.type === 'END') {
                console.log("Agent processing and stream finished.");
                 // The PESAgent saves the complete message to history *after* the stream ends.
                 // For this UI, the message is already fully displayed.
                 // If needed, you could fetch the very last message from history to confirm.
            } else if (event.type === 'ERROR') {
                console.error("Agent stream error:", event.data);
                appendMessageToLog("SYSTEM", `Error from agent: ${event.data.message || event.data}`);
                break; 
            }
        }
    } catch (error) {
        console.error("Error sending message:", error);
        appendMessageToLog("SYSTEM", `Error: ${error.message}`);
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// --- Event Listeners ---
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// --- Initialize ---
initializeAgent();

</script>
</body>
</html>
```
**Important Security Note:** Prompting for an API key in a real application is **highly insecure**. This is done here *only* for a simplified, self-contained browser demo. In production, API keys should be managed securely, typically by a backend service that makes calls to the LLM provider on behalf of the client.

## 4. Running the Example

1.  Save the HTML code above as `persistent-agent.html` in a directory.
2.  You'll need to serve the `art-framework` library so the browser can import it. The simplest way for a local demo:
    *   If your `art-framework` project has an ESM build (e.g., in `node_modules/art-framework/dist/esm/index.js` relative to your project structure), you can try to directly link to it.
    *   **Recommended for easy testing:** Use a simple HTTP server. If you have Node.js, you can install `http-server`:
        ```bash
        npm install -g http-server
        ```
        Then navigate to the directory containing `persistent-agent.html` and your `node_modules` (or where `art-framework` is accessible) and run:
        ```bash
        http-server . -o
        ```
        This will open the page in your browser.
3.  When the page loads, it will prompt you for your OpenAI API key.
4.  Open your browser's developer console (usually F12) to see logs from ART.

## How to Test Persistence

1.  Send a few messages to the agent.
2.  **Refresh the browser page.**
3.  The agent should re-initialize. Observe the console and the chat log. You should see a message like "--- Loaded X previous messages ---" and your previous messages should reappear in the chat log. This confirms that the `IndexedDBStorageAdapter` has successfully persisted and reloaded the conversation history for the `threadId` ("persistent-thread-example-001").
4.  You can also inspect your browser's IndexedDB storage:
    *   Open Developer Tools (F12).
    *   Go to the "Application" tab (in Chrome/Edge) or "Storage" tab (in Firefox).
    *   Find "IndexedDB" in the sidebar. You should see your database (e.g., "MyPersistentAgentDB_ART").
    *   You can inspect the "conversations" object store to see the raw message data.

## Key Concepts Illustrated

*   **`ArtInstanceConfig.storage` for IndexedDB:**
    ```javascript
    storage: {
        type: 'indexedDB',
        dbName: 'MyPersistentAgentDB_ART',
        dbVersion: 1,
    }
    ```
    This tells `AgentFactory` to use `IndexedDBStorageAdapter`.
*   **Initialization (`artInstance.conversationManager.getMessages`):** The UI calls this after `createArtInstance` to load and display any existing history for the thread.
*   **Automatic Persistence:** The `PESAgent` (default agent core) automatically calls `conversationManager.addMessages()` at the end of its `process` cycle. The `ConversationManager` then uses the `ConversationRepository`, which in turn uses the configured `IndexedDBStorageAdapter`, to save the messages.
*   **`StateSavingStrategy`:** If you set `stateSavingStrategy: 'implicit'` and your agent modifies `threadContext.state`, those state changes would also persist via `IndexedDBStorageAdapter` (through `StateManager` and `StateRepository`).

This example provides a basic illustration of how to achieve data persistence in browser-based ART applications.
```

```markdown
docs/examples/streaming-to-ui-conceptual.md
```
```markdown
# Example: Streaming to UI (Conceptual)

This document provides a conceptual guide and pseudo-code for how a client-side User Interface (UI) could integrate with an ART Framework backend to display real-time streaming updates. It focuses on the client-side subscription to ART's UI Sockets.

**Prerequisites:**

*   An ART Framework backend application is running and exposing its UI Sockets.
*   A communication channel is established between the frontend (browser) and the backend (e.g., WebSockets, Server-Sent Events, or a library that abstracts this). This guide **does not** cover setting up this communication channel itself but focuses on how to use ART's socket concepts once that channel is in place.

**Conceptual Client-Side `artSockets` Object:**

For this example, let's imagine a client-side JavaScript object, `artSockets`, that acts as a proxy or interface to the backend ART sockets. Its methods would internally handle sending subscription requests to the backend and routing incoming events from the backend to the correct client-side callbacks.

```javascript
// --- Conceptual Client-Side artSockets Object ---
// This is NOT actual ART Framework code, but a representation
// of what your client-side WebSocket/SSE wrapper might provide.

const artSockets = {
    llmStream: {
        /**
         * @param {(event: StreamEvent) => void} callback
         * @param {Array<StreamEvent['type']> | StreamEvent['type']} filter - Event types to subscribe to
         * @param {{ threadId?: string, sessionId?: string }} options
         * @returns {() => void} Unsubscribe function
         */
        subscribe: function(callback, filter, options) {
            console.log(`[UI] Subscribing to LLMStream: Filter=${JSON.stringify(filter)}, Options=${JSON.stringify(options)}`);
            // Actual implementation: Send subscription message to backend via WebSocket/SSE
            // Store callback locally, keyed by subscription ID or criteria
            const subId = `llm-${Date.now()}`;
            // window.myBackendConnection.send({ type: 'subscribe_llm', subId, filter, options });
            // window.myBackendConnection.onMessage((backendEvent) => {
            //    if (backendEvent.subId === subId && backendEvent.type === 'llm_event_data') {
            //        callback(backendEvent.payload);
            //    }
            // });
            return () => {
                console.log(`[UI] Unsubscribing from LLMStream: ${subId}`);
                // window.myBackendConnection.send({ type: 'unsubscribe_llm', subId });
            };
        }
    },
    observation: {
        /**
         * @param {(observation: Observation) => void} callback
         * @param {Array<ObservationType> | ObservationType} filter - Observation types
         * @param {{ threadId?: string }} options
         * @returns {() => void} Unsubscribe function
         */
        subscribe: function(callback, filter, options) { /* Similar WebSocket/SSE logic */ return () => {}; },
        /**
         * @param {Array<ObservationType> | ObservationType} filter
         * @param {{ threadId?: string, limit?: number }} options
         * @returns {Promise<Observation[]>}
         */
        getHistory: async function(filter, options) {
            console.log(`[UI] Requesting Observation History: Filter=${JSON.stringify(filter)}, Options=${JSON.stringify(options)}`);
            // Actual implementation: Send request to backend, await response
            // return window.myBackendConnection.request({ type: 'get_observation_history', filter, options });
            return Promise.resolve([]); // Mock
        }
    },
    conversation: {
        /**
         * @param {(message: ConversationMessage) => void} callback
         * @param {Array<MessageRole> | MessageRole} filter - Message roles
         * @param {{ threadId?: string }} options
         * @returns {() => void} Unsubscribe function
         */
        subscribe: function(callback, filter, options) { /* Similar WebSocket/SSE logic */ return () => {}; },
        /**
         * @param {Array<MessageRole> | MessageRole} filter
         * @param {{ threadId?: string, limit?: number }} options
         * @returns {Promise<ConversationMessage[]>}
         */
        getHistory: async function(filter, options) {
            console.log(`[UI] Requesting Conversation History: Filter=${JSON.stringify(filter)}, Options=${JSON.stringify(options)}`);
            // return window.myBackendConnection.request({ type: 'get_conversation_history', filter, options });
            return Promise.resolve([]); // Mock
        }
    }
};
// --- End Conceptual Client-Side artSockets Object ---
```

## Displaying Streaming LLM Responses

This is often the most desired real-time feature.

**HTML:**
```html
<div id="llm-output-area"></div>
<p id="llm-status-indicator"></p>
```

**JavaScript:**
```javascript
const llmOutputElement = document.getElementById('llm-output-area');
const llmStatusIndicator = document.getElementById('llm-status-indicator');
let currentLLMStreamUnsubscribe = null;

function handleNewAgentInteraction(threadId, sessionId) {
    // Unsubscribe from any previous stream for this UI area
    if (currentLLMStreamUnsubscribe) {
        currentLLMStreamUnsubscribe();
    }

    llmOutputElement.innerHTML = ''; // Clear previous content
    llmStatusIndicator.textContent = 'Agent is processing...';

    currentLLMStreamUnsubscribe = artSockets.llmStream.subscribe(
        (event) => {
            // Ensure event is for the current context if your socket wrapper doesn't pre-filter
            if (event.threadId !== threadId /* && event.sessionId !== sessionId */) return;

            switch (event.type) {
                case 'TOKEN':
                    // We are interested in tokens that form the final answer
                    if (event.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || event.tokenType === 'LLM_RESPONSE') {
                        const span = document.createElement('span');
                        span.textContent = event.data; // event.data is the text chunk
                        llmOutputElement.appendChild(span);
                    } else if (event.tokenType && event.tokenType.includes('THOUGHT')) {
                        // Optionally display "thinking" tokens differently or log them
                        console.debug(`LLM Thought: ${event.data}`);
                        // You might have a separate area for thoughts or just log them
                        // llmStatusIndicator.textContent = `Thinking: ${event.data.slice(0, 20)}...`;
                    }
                    break;
                case 'METADATA':
                    console.info('LLM Metadata received:', event.data);
                    llmStatusIndicator.textContent = `Call complete. Stop reason: ${event.data.stopReason || 'N/A'}.`;
                    break;
                case 'ERROR':
                    console.error('LLM Stream Error:', event.data);
                    const errorMsg = event.data?.message || String(event.data);
                    llmOutputElement.innerHTML += `<p style="color: red;">Error: ${errorMsg}</p>`;
                    llmStatusIndicator.textContent = 'An error occurred.';
                    break;
                case 'END':
                    console.info('LLM Stream ended.');
                    if (llmStatusIndicator.textContent === 'Agent is processing...') {
                        llmStatusIndicator.textContent = 'Done.';
                    }
                    // The full response is now in llmOutputElement
                    // This is where you might move it to a persistent chat log area
                    break;
            }
        },
        ['TOKEN', 'METADATA', 'ERROR', 'END'], // Subscribe to all relevant event types
        { threadId: threadId, sessionId: sessionId } // Filter by thread and session
    );
}

// Example: When user sends a message and backend starts agent.process()
// Assume currentThread and currentSession are known
// handleNewAgentInteraction(currentThread, currentSession);

// Don't forget to call currentLLMStreamUnsubscribe() when the UI component
// displaying this stream is removed or the conversation changes, to prevent memory leaks.
```

## Displaying Agent Observations (Activity Log)

```html
<ul id="agent-activity-feed"></ul>
```

```javascript
const activityFeedElement = document.getElementById('agent-activity-feed');
let currentObservationUnsubscribe = null;

async function displayAgentActivity(threadId) {
    if (currentObservationUnsubscribe) {
        currentObservationUnsubscribe();
    }
    activityFeedElement.innerHTML = '<li>Loading activity...</li>';

    // Optional: Load some recent history
    try {
        const recentObservations = await artSockets.observation.getHistory(
            undefined, // No type filter, get all
            { threadId: threadId, limit: 5 }
        );
        activityFeedElement.innerHTML = ''; // Clear loading message
        recentObservations.reverse().forEach(obs => addObservationToFeed(obs)); // Display newest first
    } catch (e) {
        console.error("Error loading observation history:", e);
        activityFeedElement.innerHTML = '<li>Could not load activity history.</li>';
    }

    currentObservationUnsubscribe = artSockets.observation.subscribe(
        (observation) => {
            if (observation.threadId !== threadId) return;
            addObservationToFeed(observation);
        },
        // Example: Subscribe to a few key types for a high-level activity feed
        ['PLAN', 'TOOL_CALL', 'TOOL_EXECUTION', 'ERROR', 'FINAL_RESPONSE'],
        { threadId: threadId }
    );
}

function addObservationToFeed(observation) {
    const item = document.createElement('li');
    item.innerHTML = `
        <small>${new Date(observation.timestamp).toLocaleTimeString()}</small> -
        <strong>${observation.title}</strong> (<em>${observation.type}</em>)
        <pre style="font-size: 0.8em; background: #f4f4f4; padding: 3px; white-space: pre-wrap;">${JSON.stringify(observation.content, null, 2).substring(0, 150)}...</pre>
    `;
    // Prepend to show newest first if that's the desired order for live updates
    if (activityFeedElement.firstChild && activityFeedElement.firstChild.textContent === 'Loading activity...') {
        activityFeedElement.innerHTML = '';
    }
    activityFeedElement.prepend(item);
}

// Example: When a thread view is loaded
// displayAgentActivity(currentThread);
// Call currentObservationUnsubscribe() on cleanup.
```

## Updating Conversation History

```html
<div id="chat-messages"></div>
```

```javascript
const chatMessagesElement = document.getElementById('chat-messages');
let currentConversationUnsubscribe = null;

function displayChatMessage(message) {
    const div = document.createElement('div');
    div.className = `chat-message ${message.role.toLowerCase()}`;
    div.innerHTML = `<strong>${message.role}:</strong> <p>${message.content}</p>
                     <small>${new Date(message.timestamp).toLocaleTimeString()}</small>`;
    chatMessagesElement.appendChild(div);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

async function loadAndFollowConversation(threadId) {
    if (currentConversationUnsubscribe) {
        currentConversationUnsubscribe();
    }
    chatMessagesElement.innerHTML = '<li>Loading messages...</li>';

    try {
        const messages = await artSockets.conversation.getHistory(
            undefined, // All roles
            { threadId: threadId, limit: 100 }
        );
        chatMessagesElement.innerHTML = '';
        messages.forEach(displayChatMessage);
    } catch (e) {
        console.error("Error loading conversation history:", e);
        chatMessagesElement.innerHTML = '<li>Could not load messages.</li>';
    }

    currentConversationUnsubscribe = artSockets.conversation.subscribe(
        (message) => {
            if (message.threadId !== threadId) return;
            // Deduplication: Check if message already displayed (e.g., from initial history load)
            // This depends on how your history load and real-time updates are coordinated.
            // A simple check could be by messageId if your UI tracks them.
            // For this example, we'll assume new notifications are distinct.
            displayChatMessage(message);
        },
        undefined, // All roles
        { threadId: threadId }
    );
}

// Example: When a chat interface for a thread is loaded
// loadAndFollowConversation(currentThread);
// Call currentConversationUnsubscribe() on cleanup.
```

This conceptual guide illustrates how to consume the real-time data streams provided by ART's UI Sockets. The actual implementation will depend on your specific frontend framework (React, Vue, Angular, Svelte, vanilla JS) and the chosen backend-frontend communication protocol.