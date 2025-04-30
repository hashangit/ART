import { test, expect /*, APIRequestContext */ } from '@playwright/test'; // Removed unused APIRequestContext
import WebSocket from 'ws';
import { Observation, ConversationMessage, ObservationType, MessageRole } from 'art-framework';

// Helper class to manage WebSocket connection and messages for tests
class TestWebSocketClient {
  private ws: WebSocket | null = null;
  private receivedMessages: any[] = [];
  private connectionPromise: Promise<void> | null = null;
  private connectionResolver: (() => void) | null = null;
  private connectionRejecter: ((reason?: any) => void) | null = null;
  private messageListeners: Map<string, (payload: any) => void> = new Map(); // Store listeners by subscriptionId

  connect(url: string): Promise<void> {
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolver = resolve;
      this.connectionRejecter = reject;
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('[Test WS Client] Connected');
        this.connectionResolver?.();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          // console.log('[Test WS Client] Received:', message);
          this.receivedMessages.push(message);
          // If it's an event for a specific subscription, notify the listener
          if (message.type === 'event' && message.subscriptionId) {
            const listener = this.messageListeners.get(message.subscriptionId);
            listener?.(message.payload);
          }
        } catch (e) {
          console.error('[Test WS Client] Failed to parse message:', data.toString(), e);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[Test WS Client] Error:', error);
        this.connectionRejecter?.(error);
        this.ws = null;
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Test WS Client] Closed: ${code} ${reason}`);
        // If connection wasn't established, reject the promise
        if (this.connectionRejecter) {
            this.connectionRejecter(new Error(`WebSocket closed before connection established: ${code} ${reason}`));
        }
        this.ws = null;
        this.messageListeners.clear();
      });
    });
    return this.connectionPromise;
  }

  async subscribe(payload: { threadId: string; socketType: 'observation' | 'conversation'; filter?: any }): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');

    const subIdPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription confirmation timeout')), 5000); // 5 sec timeout

        const findSubscriptionConfirmation = (msg: any) => {
            if (msg.type === 'subscribed' && msg.payload?.threadId === payload.threadId && msg.payload?.socketType === payload.socketType) {
                clearTimeout(timeout);
                this.receivedMessages = this.receivedMessages.filter(m => m !== msg); // Remove confirmation message
                resolve(msg.payload.subscriptionId);
                // Remove this specific listener after confirmation
                this.ws?.removeListener('message', findSubscriptionConfirmationWrapper);
            }
        };
         // Wrap for removal
        const findSubscriptionConfirmationWrapper = (data: Buffer) => {
            try { findSubscriptionConfirmation(JSON.parse(data.toString())); } catch { /* Ignore parsing errors */ }
        };
        this.ws?.on('message', findSubscriptionConfirmationWrapper);
    });


    this.ws.send(JSON.stringify({ type: 'subscribe', payload }));
    return subIdPromise;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
     if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');

     const unsubPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Unsubscription confirmation timeout')), 5000);
         const findUnsubConfirmation = (msg: any) => {
            if (msg.type === 'unsubscribed' && msg.payload?.subscriptionId === subscriptionId) {
                clearTimeout(timeout);
                this.receivedMessages = this.receivedMessages.filter(m => m !== msg);
                resolve();
                this.ws?.removeListener('message', findUnsubConfirmationWrapper);
            }
        };
        const findUnsubConfirmationWrapper = (data: Buffer) => {
             try { findUnsubConfirmation(JSON.parse(data.toString())); } catch { /* Ignore parsing errors */ }
        };
        this.ws?.on('message', findUnsubConfirmationWrapper);
     });

     this.ws.send(JSON.stringify({ type: 'unsubscribe', payload: { subscriptionId } }));
     this.messageListeners.delete(subscriptionId); // Remove listener immediately
     return unsubPromise;
  }

  waitForMessage<T>(subscriptionId: string, condition: (payload: T) => boolean, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Clean up listener before rejecting
        this.messageListeners.delete(subscriptionId);
        reject(new Error(`Timeout waiting for message on subscription ${subscriptionId} after ${timeoutMs}ms`));
      }, timeoutMs);

      const listener = (payload: T) => {
        if (condition(payload)) {
          clearTimeout(timeout);
          // Clean up listener after message received
          this.messageListeners.delete(subscriptionId);
          resolve(payload);
        }
      };

      this.messageListeners.set(subscriptionId, listener);
    });
  }

  close() {
    this.ws?.close();
    this.messageListeners.clear();
  }
}

// --- Tests ---

// Use the same port as the HTTP server defined in playwright.config.ts webServer section
const WS_URL = 'ws://localhost:3001'; // Assuming WS server is attached to the HTTP server

test.describe('E2E UI Socket Tests', () => {
  let wsClient: TestWebSocketClient;

  test.beforeEach(async () => {
    wsClient = new TestWebSocketClient();
    await wsClient.connect(WS_URL);
  });

  test.afterEach(() => {
    wsClient.close();
  });

  test('should receive Observation events', async ({ request }) => {
    const threadId = `socket-obs-${Date.now()}`;
    const subscriptionId = await wsClient.subscribe({ threadId, socketType: 'observation' });

    // Wait specifically for the INTENT observation
    const intentPromise = wsClient.waitForMessage<Observation>(subscriptionId,
      (obs) => obs.type === ObservationType.INTENT && obs.threadId === threadId
    );

    // Trigger processing
    await request.post('/process', { data: { query: "What is 2+2?", threadId } });

    // Assert the received observation
    const intentObservation = await intentPromise;
    expect(intentObservation).toBeDefined();
    expect(intentObservation.type).toBe(ObservationType.INTENT);
    expect(intentObservation.threadId).toBe(threadId);
    expect(intentObservation.content).toBeTruthy(); // Intent content might vary

    // Optionally wait for other observations like PLAN, TOOL_CALL, SYNTHESIS etc.
    const synthesisPromise = wsClient.waitForMessage<Observation>(subscriptionId,
        (obs) => obs.type === ObservationType.SYNTHESIS && obs.threadId === threadId
    );
    const synthesisObservation = await synthesisPromise;
    expect(synthesisObservation).toBeDefined();
    expect(synthesisObservation.type).toBe(ObservationType.SYNTHESIS);

    await wsClient.unsubscribe(subscriptionId);
  });

  test('should receive ConversationMessage events', async ({ request }) => {
    const threadId = `socket-conv-${Date.now()}`;
    const subscriptionId = await wsClient.subscribe({ threadId, socketType: 'conversation' });

    // Wait specifically for the AI response message
    const aiResponsePromise = wsClient.waitForMessage<ConversationMessage>(subscriptionId,
      (msg) => msg.role === MessageRole.AI && msg.threadId === threadId
    );

    // Trigger processing
    const userQuery = "Tell me a short joke";
    await request.post('/process', { data: { query: userQuery, threadId } });

    // Assert the received message
    const aiMessage = await aiResponsePromise;
    expect(aiMessage).toBeDefined();
    expect(aiMessage.role).toBe(MessageRole.AI);
    expect(aiMessage.threadId).toBe(threadId);
    expect(aiMessage.content).toBeTruthy(); // Joke content will vary
    expect(aiMessage.content.length).toBeGreaterThan(5); // Basic check for non-empty response

    await wsClient.unsubscribe(subscriptionId);
  });

   test('should handle multiple subscriptions and unsubscription', async ({ request }) => {
    const threadId1 = `socket-multi-1-${Date.now()}`;
    const threadId2 = `socket-multi-2-${Date.now()}`;

    // Subscribe to observations on thread 1
    const obsSubId1 = await wsClient.subscribe({ threadId: threadId1, socketType: 'observation' });
    // Subscribe to messages on thread 2
    const msgSubId2 = await wsClient.subscribe({ threadId: threadId2, socketType: 'conversation' });

    // Promises to wait for specific events
    const obsPromise1 = wsClient.waitForMessage<Observation>(obsSubId1, obs => obs.type === ObservationType.PLAN && obs.threadId === threadId1);
    const msgPromise2 = wsClient.waitForMessage<ConversationMessage>(msgSubId2, msg => msg.role === MessageRole.AI && msg.threadId === threadId2);

    // Trigger thread 1
    await request.post('/process', { data: { query: "Plan to make tea", threadId: threadId1 } });
    // Trigger thread 2
    await request.post('/process', { data: { query: "Hello there", threadId: threadId2 } });

    // Wait for events
    const receivedObs1 = await obsPromise1;
    const receivedMsg2 = await msgPromise2;

    expect(receivedObs1).toBeDefined();
    expect(receivedObs1.threadId).toBe(threadId1);
    expect(receivedObs1.type).toBe(ObservationType.PLAN);

    expect(receivedMsg2).toBeDefined();
    expect(receivedMsg2.threadId).toBe(threadId2);
    expect(receivedMsg2.role).toBe(MessageRole.AI);

    // Unsubscribe from thread 1 observations
    await wsClient.unsubscribe(obsSubId1);

    // Trigger thread 1 again - should NOT receive observation on the unsubscribed listener
    const secondObsPromise1 = wsClient.waitForMessage<Observation>(obsSubId1, obs => obs.threadId === threadId1, 1000) // Short timeout
        .then(() => { throw new Error('Should not have received message after unsubscribe'); })
        .catch(err => { expect(err.message).toContain('Timeout'); }); // Expect timeout

    await request.post('/process', { data: { query: "Plan something else", threadId: threadId1 } });
    await secondObsPromise1; // Verify it timed out

    // Cleanup remaining subscription
    await wsClient.unsubscribe(msgSubId2);
  });

});