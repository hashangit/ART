// examples/ui-sockets-basic.js

// --- Mock ART Framework Setup (Replace with actual framework import/setup) ---

// Mock Repositories (needed for socket instantiation)
const mockObservationRepository = {
    getObservations: async (threadId, filter) => {
        console.log(`[Mock Repo] getObservations called for ${threadId} with filter:`, filter);
        // Return some mock history based on filter if needed for testing getHistory
        return [];
    }
    // addObservation would be used by ObservationManager, not directly by UI example
};
const mockConversationRepository = {
    getMessages: async (threadId, options) => {
        console.log(`[Mock Repo] getMessages called for ${threadId} with options:`, options);
        // Return some mock history
        return [];
    }
    // addMessages would be used by ConversationManager, not directly by UI example
};

// Assume UISystem class is available (e.g., from a bundle)
// In a real app, you'd import { UISystem } from 'art-framework';
class MockUISystem {
    constructor(obsRepo, convRepo) {
        // Mock Sockets with basic subscribe/notify/getHistory
        this.obsSocket = {
            subscriptions: [],
            subscribe: (cb, filter, opts) => {
                const sub = { cb, filter, opts };
                this.obsSocket.subscriptions.push(sub);
                console.log('[Obs Socket] New subscription:', { filter, opts });
                return () => {
                    this.obsSocket.subscriptions = this.obsSocket.subscriptions.filter(s => s !== sub);
                    console.log('[Obs Socket] Unsubscribed:', { filter, opts });
                };
            },
            notify: (data, opts, filterCheck) => { // Simulate internal notify logic
                 console.log('[Obs Socket] Notifying data:', data.type, 'for thread', opts?.targetThreadId);
                 this.obsSocket.subscriptions.forEach(sub => {
                     const threadMatch = !sub.opts?.threadId || !opts?.targetThreadId || sub.opts.threadId === opts.targetThreadId;
                     const filterMatch = !filterCheck || !sub.filter || filterCheck(data, sub.filter);
                     if (threadMatch && filterMatch) {
                         sub.cb(data);
                     }
                 });
            },
             // Simulate the actual notifyObservation method added to the class
            notifyObservation: function(observation) {
                this.notify(
                    observation,
                    { targetThreadId: observation.threadId },
                    (data, filter) => { // The filter check logic from ObservationSocket
                        if (!filter) return true;
                        if (Array.isArray(filter)) return filter.includes(data.type);
                        return data.type === filter;
                    }
                );
            },
            getHistory: async (filter, opts) => {
                console.log('[Obs Socket] getHistory called with filter:', filter, 'options:', opts);
                return obsRepo.getObservations(opts?.threadId, { types: Array.isArray(filter) ? filter : (filter ? [filter] : undefined), limit: opts?.limit });
            }
        };
        this.convSocket = {
             subscriptions: [],
            subscribe: (cb, filter, opts) => {
                const sub = { cb, filter, opts };
                this.convSocket.subscriptions.push(sub);
                console.log('[Conv Socket] New subscription:', { filter, opts });
                 return () => {
                    this.convSocket.subscriptions = this.convSocket.subscriptions.filter(s => s !== sub);
                    console.log('[Conv Socket] Unsubscribed:', { filter, opts });
                };
            },
             notify: (data, opts, filterCheck) => { // Simulate internal notify logic
                 console.log('[Conv Socket] Notifying data:', data.role, 'for thread', opts?.targetThreadId);
                 this.convSocket.subscriptions.forEach(sub => {
                     const threadMatch = !sub.opts?.threadId || !opts?.targetThreadId || sub.opts.threadId === opts.targetThreadId;
                     const filterMatch = !filterCheck || !sub.filter || filterCheck(data, sub.filter);
                     if (threadMatch && filterMatch) {
                         sub.cb(data);
                     }
                 });
            },
             // Simulate the actual notifyMessage method added to the class
            notifyMessage: function(message) {
                 this.notify(
                    message,
                    { targetThreadId: message.threadId },
                     (data, filter) => { // The filter check logic from ConversationSocket
                        if (!filter) return true;
                        if (Array.isArray(filter)) return filter.includes(data.role);
                        return data.role === filter;
                    }
                );
            },
            getHistory: async (filter, opts) => {
                 console.log('[Conv Socket] getHistory called with filter:', filter, 'options:', opts);
                 // Note: Role filtering isn't directly supported by repo, example reflects this
                 return convRepo.getMessages(opts?.threadId, { limit: opts?.limit });
            }
        };
    }
    getObservationSocket() { return this.obsSocket; }
    getConversationSocket() { return this.convSocket; }
}

// Assume ObservationType and MessageRole enums/objects are available
const ObservationType = { INTENT: 'INTENT', PLAN: 'PLAN', THOUGHTS: 'THOUGHTS', TOOL_CALL: 'TOOL_CALL', TOOL_EXECUTION: 'TOOL_EXECUTION', ERROR: 'ERROR' };
const MessageRole = { USER: 'USER', AI: 'AI', SYSTEM: 'SYSTEM', TOOL: 'TOOL' };


// Instantiate the system (using mocks for this example)
const uiSystem = new MockUISystem(mockObservationRepository, mockConversationRepository);

// --- Example Usage ---

const threadId1 = 'thread-abc';
const threadId2 = 'thread-xyz';

console.log(`\n--- Subscribing to Observations (Thread: ${threadId1}) ---`);

// 1. Subscribe to ALL observations for threadId1
const unsubAllObsT1 = uiSystem.getObservationSocket().subscribe(
    (observation) => {
        console.log(`[Callback All Obs T1] Received: ${observation.type} - ${observation.title}`);
        // Update UI with the observation details
    },
    undefined, // No type filter
    { threadId: threadId1 }
);

// 2. Subscribe only to PLAN and ERROR observations for threadId1
const unsubPlanErrorObsT1 = uiSystem.getObservationSocket().subscribe(
    (observation) => {
        console.log(`[Callback Plan/Error Obs T1] Received: ${observation.type} - ${JSON.stringify(observation.content)}`);
        // Update specific UI parts related to planning or errors
    },
    [ObservationType.PLAN, ObservationType.ERROR], // Filter by type array
    { threadId: threadId1 }
);

// 3. Subscribe to THOUGHTS for threadId2
const unsubThoughtsObsT2 = uiSystem.getObservationSocket().subscribe(
    (observation) => {
        console.log(`[Callback Thoughts Obs T2] Received: ${observation.content}`);
    },
    ObservationType.THOUGHTS,
    { threadId: threadId2 }
);


console.log(`\n--- Subscribing to Conversations (Thread: ${threadId1}) ---`);

// 4. Subscribe to ALL messages for threadId1
const unsubAllConvT1 = uiSystem.getConversationSocket().subscribe(
    (message) => {
        console.log(`[Callback All Conv T1] Received [${message.role}]: ${message.content}`);
        // Append message to the chat UI
    },
    undefined, // No role filter
    { threadId: threadId1 }
);

// 5. Subscribe only to AI messages for threadId1
const unsubAiConvT1 = uiSystem.getConversationSocket().subscribe(
    (message) => {
        console.log(`[Callback AI Conv T1] Received [${message.role}]: ${message.content}`);
        // Maybe handle AI messages differently (e.g., styling)
    },
    MessageRole.AI, // Filter by single role
    { threadId: threadId1 }
);


console.log('\n--- Simulating Framework Events ---');

// Simulate some observations being generated by the framework
const obs1_plan_t1 = { id: 'o1', threadId: threadId1, type: ObservationType.PLAN, title: 'Plan Generated', content: { steps: ['1', '2'] }, timestamp: Date.now() };
const obs2_tool_t1 = { id: 'o2', threadId: threadId1, type: ObservationType.TOOL_CALL, title: 'Tool Called', content: { name: 'calc', args: {} }, timestamp: Date.now() };
const obs3_error_t1 = { id: 'o3', threadId: threadId1, type: ObservationType.ERROR, title: 'Error Occurred', content: 'Tool execution failed', timestamp: Date.now() };
const obs4_thoughts_t2 = { id: 'o4', threadId: threadId2, type: ObservationType.THOUGHTS, title: 'Thinking...', content: 'I should use the calculator', timestamp: Date.now() };

// Simulate ObservationManager calling notifyObservation
uiSystem.getObservationSocket().notifyObservation(obs1_plan_t1); // Should trigger All(T1), Plan/Error(T1)
uiSystem.getObservationSocket().notifyObservation(obs2_tool_t1); // Should trigger All(T1)
uiSystem.getObservationSocket().notifyObservation(obs3_error_t1); // Should trigger All(T1), Plan/Error(T1)
uiSystem.getObservationSocket().notifyObservation(obs4_thoughts_t2); // Should trigger Thoughts(T2)


// Simulate some messages being added by the framework
const msg1_user_t1 = { messageId: 'm1', threadId: threadId1, role: MessageRole.USER, content: 'What is 2+2?', timestamp: Date.now() };
const msg2_ai_t1 = { messageId: 'm2', threadId: threadId1, role: MessageRole.AI, content: 'Thinking...', timestamp: Date.now() };
const msg3_ai_t1_result = { messageId: 'm3', threadId: threadId1, role: MessageRole.AI, content: '2 + 2 equals 4.', timestamp: Date.now() };
const msg4_user_t2 = { messageId: 'm4', threadId: threadId2, role: MessageRole.USER, content: 'Hello world', timestamp: Date.now() };

// Simulate ConversationManager calling notifyMessage
uiSystem.getConversationSocket().notifyMessage(msg1_user_t1); // Should trigger All(T1)
uiSystem.getConversationSocket().notifyMessage(msg2_ai_t1); // Should trigger All(T1), AI(T1)
uiSystem.getConversationSocket().notifyMessage(msg3_ai_t1_result); // Should trigger All(T1), AI(T1)
uiSystem.getConversationSocket().notifyMessage(msg4_user_t2); // Should trigger nothing (wrong thread)


console.log('\n--- Fetching History Example ---');

// Example: Get last 5 observations of any type for threadId1
uiSystem.getObservationSocket().getHistory(undefined, { threadId: threadId1, limit: 5 })
    .then(history => console.log('[History Obs T1]', history));

// Example: Get last 3 AI messages for threadId1
uiSystem.getConversationSocket().getHistory(MessageRole.AI, { threadId: threadId1, limit: 3 })
    .then(history => console.log('[History AI Conv T1]', history));


console.log('\n--- Unsubscribing ---');
unsubAllObsT1(); // Unsubscribe from all observations on thread 1
unsubPlanErrorObsT1(); // Unsubscribe from plan/error observations on thread 1
unsubThoughtsObsT2(); // Unsubscribe from thoughts observations on thread 2
unsubAllConvT1(); // Unsubscribe from all conversation messages on thread 1
unsubAiConvT1(); // Unsubscribe from AI messages on thread 1

// Further notifications for these subscriptions will not trigger the callbacks.
uiSystem.getObservationSocket().notifyObservation({ ...obs1_plan_t1, id: 'o5' }); // All(T1) callback won't run
uiSystem.getConversationSocket().notifyMessage({ ...msg2_ai_t1, messageId: 'm5' }); // AI(T1) callback won't run, All(T1) still will

console.log('\n--- Example End ---');