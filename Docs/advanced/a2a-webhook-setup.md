# A2A Webhook Setup Guide

This guide explains how to set up webhooks for Agent-to-Agent (A2A) task status notifications in the ART Framework. Webhooks enable real-time updates when remote agents complete or update delegated tasks.

## Overview

When the ART Framework delegates tasks to remote agents, it provides a callback URL for webhook notifications. Remote agents can use these webhooks to notify your ART instance about task status changes, completion, or failures without requiring constant polling.

### Benefits of Webhooks

- **Real-time Updates**: Receive immediate notifications when task status changes
- **Reduced Latency**: No need to wait for polling intervals
- **Lower Resource Usage**: Eliminates the overhead of constant status checking
- **Better User Experience**: Faster response times and more responsive applications

## Webhook Flow

1. **Task Delegation**: ART Framework sends a task to a remote agent with a `callbackUrl`
2. **Remote Processing**: The remote agent processes the task asynchronously
3. **Status Updates**: Remote agent sends webhook notifications to the callback URL
4. **Local Updates**: Your webhook handler updates the local task status
5. **UI Notifications**: Updated status is propagated to connected clients via sockets

## Setting Up Webhook Endpoints

### Basic Express.js Webhook Handler

Here's a complete example of setting up A2A webhook endpoints using Express.js:

```javascript
const express = require('express');
const { createArtInstance } = require('art-framework');

const app = express();
app.use(express.json());

// Initialize ART Framework
let artInstance;

async function initializeART() {
  artInstance = await createArtInstance({
    storage: { type: 'indexedDB', dbName: 'ArtWebhookDB' },
    providers: {
      // Your provider configuration
    }
  });
}

// Webhook endpoint for A2A task updates
app.post('/api/a2a/callback/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const webhookData = req.body;
  
  console.log(`Received webhook for task ${taskId}:`, webhookData);
  
  try {
    // Validate webhook data
    if (!webhookData.status || !webhookData.taskId) {
      return res.status(400).json({ 
        error: 'Invalid webhook data: missing required fields' 
      });
    }
    
    // Verify task ID matches URL parameter
    if (webhookData.taskId !== taskId) {
      return res.status(400).json({ 
        error: 'Task ID mismatch between URL and payload' 
      });
    }
    
    // Get current task from repository
    const currentTask = await artInstance.getA2ATaskRepository()
      .getTask(taskId);
    
    if (!currentTask) {
      return res.status(404).json({ 
        error: `Task ${taskId} not found` 
      });
    }
    
    // Update task based on webhook data
    const updates = {
      status: webhookData.status,
      metadata: {
        ...currentTask.metadata,
        updatedAt: Date.now(),
        lastWebhookUpdate: Date.now()
      }
    };
    
    // Handle completion with results
    if (webhookData.status === 'COMPLETED' && webhookData.result) {
      updates.result = webhookData.result;
      updates.metadata.completedAt = Date.now();
    }
    
    // Handle failure with error details
    if (webhookData.status === 'FAILED' && webhookData.error) {
      updates.result = {
        success: false,
        error: webhookData.error,
        metadata: { 
          remoteError: true, 
          timestamp: Date.now() 
        }
      };
      updates.metadata.completedAt = Date.now();
    }
    
    // Add progress information if available
    if (webhookData.progress !== undefined) {
      updates.metadata.progress = webhookData.progress;
    }
    
    // Update the task in the repository
    await artInstance.getA2ATaskRepository()
      .updateTask(taskId, updates);
    
    // Notify UI about the update via socket
    const uiSystem = artInstance.uiSystem;
    const a2aSocket = uiSystem.getA2ATaskSocket();
    
    const updatedTask = { ...currentTask, ...updates };
    a2aSocket.notifyTaskUpdated(
      updatedTask, 
      currentTask.status, 
      {
        automatic: true,
        source: 'webhook',
        context: { 
          webhookTimestamp: Date.now(),
          remoteAgent: currentTask.targetAgent?.agentName 
        }
      }
    );
    
    // Log successful webhook processing
    console.log(`Successfully processed webhook for task ${taskId}: ${webhookData.status}`);
    
    // Respond with success
    res.status(200).json({ 
      success: true, 
      message: `Task ${taskId} updated successfully`,
      status: webhookData.status
    });
    
  } catch (error) {
    console.error(`Webhook processing error for task ${taskId}:`, error);
    res.status(500).json({ 
      error: 'Internal server error processing webhook',
      taskId: taskId
    });
  }
});

// Health check endpoint for webhook service
app.get('/api/a2a/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'a2a-webhook-handler'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await initializeART();
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`A2A webhook endpoint: http://localhost:${PORT}/api/a2a/callback/:taskId`);
});
```

### Advanced Webhook Handler with Authentication

For production environments, implement proper authentication and validation:

```javascript
const crypto = require('crypto');

// Middleware for webhook signature verification
function verifyWebhookSignature(secret) {
  return (req, res, next) => {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing webhook signature or timestamp' });
    }
    
    // Verify timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    
    if (Math.abs(currentTime - webhookTime) > 300) { // 5 minutes tolerance
      return res.status(401).json({ error: 'Webhook timestamp too old' });
    }
    
    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    next();
  };
}

// Protected webhook endpoint
app.post('/api/a2a/callback/:taskId', 
  verifyWebhookSignature(process.env.WEBHOOK_SECRET),
  async (req, res) => {
    // Your webhook handling logic here
  }
);
```

## Webhook Payload Format

Remote agents should send webhook notifications with the following JSON structure:

### Task Status Update

```json
{
  "taskId": "task-123-abc",
  "status": "IN_PROGRESS",
  "progress": 45,
  "timestamp": 1640995200000,
  "metadata": {
    "estimatedCompletionMs": 5000,
    "currentStep": "data_processing",
    "agentInfo": {
      "agentId": "remote-agent-1",
      "version": "1.2.0"
    }
  }
}
```

### Task Completion

```json
{
  "taskId": "task-123-abc", 
  "status": "COMPLETED",
  "timestamp": 1640995800000,
  "result": {
    "success": true,
    "data": {
      "processedItems": 150,
      "summary": "Data analysis completed successfully",
      "outputUrl": "https://remote-agent.com/results/task-123-abc"
    },
    "durationMs": 45000,
    "metadata": {
      "tokensUsed": 2500,
      "confidence": 0.95
    }
  }
}
```

### Task Failure

```json
{
  "taskId": "task-123-abc",
  "status": "FAILED", 
  "timestamp": 1640995800000,
  "error": "Insufficient input data for analysis",
  "result": {
    "success": false,
    "error": "Validation failed: Missing required field 'data_source'",
    "metadata": {
      "errorCode": "VALIDATION_ERROR",
      "retryable": true
    }
  }
}
```

## Configuration

### Environment Variables

Configure your webhook server with these environment variables:

```bash
# Server configuration
PORT=3000
NODE_ENV=production

# Webhook security
WEBHOOK_SECRET=your-webhook-signing-secret
WEBHOOK_TIMEOUT=30000

# ART Framework configuration
ART_STORAGE_TYPE=indexedDB
ART_DB_NAME=ProductionArtDB

# Logging
LOG_LEVEL=info
WEBHOOK_LOG_ENABLED=true
```

### ART Framework Configuration

Configure callback URL generation in your ART instance:

```javascript
const artInstance = await createArtInstance({
  storage: { type: 'indexedDB', dbName: 'ArtDB' },
  providers: { /* provider config */ },
  // Custom webhook configuration
  webhookConfig: {
    baseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
    callbackPath: '/api/a2a/callback',
    timeout: 30000,
    retryAttempts: 3
  }
});
```

## Integration Guidelines

### 1. Webhook Registration

When delegating tasks, ensure your callback URLs are properly formed:

```javascript
// In your task delegation code
const callbackUrl = `${webhookConfig.baseUrl}${webhookConfig.callbackPath}/${taskId}`;

const taskPayload = {
  taskId: taskId,
  taskType: 'data_analysis',
  input: analysisData,
  sourceAgent: sourceAgentInfo,
  callbackUrl: callbackUrl,
  metadata: {
    createdAt: Date.now(),
    timeoutMs: 300000  // 5 minutes
  }
};
```

### 2. Error Handling

Implement robust error handling for webhook failures:

```javascript
// Webhook error handling middleware
app.use('/api/a2a', (err, req, res, next) => {
  console.error('Webhook error:', err);
  
  // Log to monitoring system
  logWebhookError(err, req);
  
  // Return appropriate error response
  res.status(500).json({
    error: 'Webhook processing failed',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id']
  });
});
```

### 3. Rate Limiting

Protect your webhook endpoints from abuse:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many webhook requests from this IP'
});

app.use('/api/a2a/callback', webhookLimiter);
```

### 4. Monitoring and Logging

Implement comprehensive monitoring for webhook operations:

```javascript
// Webhook metrics middleware
app.use('/api/a2a/callback/:taskId', (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { taskId } = req.params;
    
    // Log webhook metrics
    console.log(`Webhook processed: ${taskId} | Status: ${res.statusCode} | Duration: ${duration}ms`);
    
    // Send to monitoring system
    metrics.increment('webhook.processed', {
      status: res.statusCode,
      taskId: taskId
    });
    
    metrics.timing('webhook.duration', duration);
  });
  
  next();
});
```

## Security Considerations

### 1. HTTPS in Production

Always use HTTPS for webhook endpoints in production:

```javascript
const https = require('https');
const fs = require('fs');

// HTTPS server configuration
const httpsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS Webhook server running on port 443');
});
```

### 2. IP Whitelisting

Restrict webhook access to known remote agents:

```javascript
const allowedIPs = process.env.ALLOWED_WEBHOOK_IPS?.split(',') || [];

function ipWhitelist(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'IP not whitelisted for webhooks' });
  }
  
  next();
}

app.use('/api/a2a/callback', ipWhitelist);
```

### 3. Input Validation

Validate all webhook payloads thoroughly:

```javascript
const Joi = require('joi');

const webhookSchema = Joi.object({
  taskId: Joi.string().required(),
  status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED').required(),
  timestamp: Joi.number().required(),
  progress: Joi.number().min(0).max(100),
  result: Joi.object(),
  error: Joi.string(),
  metadata: Joi.object()
});

function validateWebhookPayload(req, res, next) {
  const { error } = webhookSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      error: 'Invalid webhook payload',
      details: error.details
    });
  }
  
  next();
}
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Received

**Symptoms**: Remote agent reports success but local task status doesn't update

**Solutions**:
- Check if webhook endpoint is accessible from the internet
- Verify firewall rules and network configuration
- Test webhook endpoint manually with curl:

```bash
curl -X POST http://your-domain.com/api/a2a/callback/test-task \
  -H "Content-Type: application/json" \
  -d '{"taskId":"test-task","status":"COMPLETED","timestamp":1640995800000}'
```

#### 2. Authentication Failures

**Symptoms**: Webhook requests return 401 Unauthorized

**Solutions**:
- Verify webhook secret configuration
- Check timestamp tolerance settings
- Ensure signature generation matches your verification logic

#### 3. Task Not Found Errors

**Symptoms**: Webhook returns 404 Task Not Found

**Solutions**:
- Check task ID format and encoding
- Verify task was properly stored during delegation
- Ensure task hasn't been deleted or expired

#### 4. High Latency

**Symptoms**: Slow webhook processing affecting remote agents

**Solutions**:
- Optimize database queries in webhook handlers
- Implement asynchronous processing for complex updates
- Add connection pooling and caching

### Debugging Tips

1. **Enable Debug Logging**:
```javascript
const debug = require('debug')('webhook');

app.post('/api/a2a/callback/:taskId', (req, res) => {
  debug('Webhook received:', req.params.taskId, req.body);
  // ... webhook logic
});
```

2. **Test with ngrok** (for local development):
```bash
# Install ngrok
npm install -g ngrok

# Expose local webhook server
ngrok http 3000

# Use the ngrok URL as your webhook base URL
# https://abc123.ngrok.io/api/a2a/callback/:taskId
```

3. **Webhook Replay** (for testing):
```javascript
// Store webhook payloads for replay during debugging
app.post('/api/a2a/callback/:taskId', (req, res) => {
  // Store for debugging
  fs.writeFileSync(`/tmp/webhook-${req.params.taskId}.json`, 
    JSON.stringify(req.body, null, 2));
  
  // Process webhook...
});
```

## Best Practices

1. **Idempotency**: Design webhook handlers to handle duplicate deliveries gracefully
2. **Timeouts**: Set appropriate timeouts for webhook processing
3. **Retry Logic**: Implement exponential backoff for failed webhook deliveries
4. **Monitoring**: Set up alerts for webhook failures and high latency
5. **Documentation**: Provide clear webhook documentation for remote agent developers
6. **Testing**: Create comprehensive test suites for webhook scenarios

## Next Steps

- Set up monitoring and alerting for webhook operations
- Implement webhook retry mechanisms for failed deliveries
- Create webhook testing tools for remote agent developers
- Consider implementing webhook payload transformation for different agent protocols

For more information about A2A task delegation, see the [A2A Task System](../core-concepts/a2a-tasks.md) documentation. 