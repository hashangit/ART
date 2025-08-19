# Browser-First Architecture

## 1. Overview

The ART framework is designed with a **browser-first philosophy**. This means it is engineered to be 100% compatible with modern web browsers out-of-the-box, without requiring Node.js-specific polyfills or shims. This design choice makes it an ideal foundation for building sophisticated AI agents that run directly on the client-side.

## 2. Core Principles of Browser Compatibility

To achieve this, the framework adheres to several core principles:

### 1. Use of Web-Standard APIs

The framework exclusively uses transport layers and APIs that are native to the web platform.

*   **MCP Transport**: For remote MCP connections, the framework uses the [`StreamableHTTPTransport`](./StreamableHTTPTransport.md), which is built on the standard `fetch` API. Node.js-specific transports like `stdio` (based on `child_process`) are not included in the browser-targeted builds.
*   **Timers and Events**: The framework uses browser-standard types and implementations for asynchronous operations, such as `number` for `setTimeout` return values and a lightweight, browser-compatible event emitter instead of the Node.js `events` module.

### 2. Explicit Configuration

The framework avoids reliance on Node.js-specific environment variables like `process.env`. All configuration, including API keys, endpoints, and feature flags, is passed explicitly through the `ArtInstanceConfig` object during initialization. This ensures a consistent and predictable configuration mechanism across all environments.

### 3. No Node.js Globals or Modules

The codebase is free of dependencies on Node.js built-in modules (e.g., `fs`, `path`, `child_process`, `events`) and global objects (e.g., `process`, `global`). This clean separation ensures that the framework can be bundled and executed in a browser environment without errors.

By following these principles, the ART framework provides a robust and reliable platform for developing the next generation of browser-based AI applications.