# Installation

This guide will walk you through installing the ART Framework into your project.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** ART is a TypeScript library and typically runs in a Node.js environment or a browser environment bundled with tools like Webpack or Vite. We recommend using a recent LTS version of Node.js (e.g., v18.x or v20.x). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm (Node Package Manager) or yarn:** These are package managers for JavaScript and come bundled with Node.js (npm) or can be installed separately (yarn).

## Installing ART Framework

You can install the ART Framework using either npm or yarn. Open your project's terminal and run one ofthe following commands:

**Using npm:**

```bash
npm install art-framework
```

**Using yarn:**

```bash
yarn add art-framework
```

This command will download the ART Framework package and add it to your project's `node_modules` directory and `package.json` file.

## Verifying Installation (Optional)

After installation, you can verify that the package is correctly installed by trying to import a core component in a test JavaScript or TypeScript file.

For example, create a file named `test-art.js` (or `.ts`):

```typescript
// test-art.ts
import { createArtInstance, PESAgent, InMemoryStorageAdapter, OpenAIAdapter } from 'art-framework';

console.log('ART Framework components imported successfully!');
console.log('createArtInstance:', typeof createArtInstance);
console.log('PESAgent:', typeof PESAgent);
console.log('InMemoryStorageAdapter:', typeof InMemoryStorageAdapter);
console.log('OpenAIAdapter:', typeof OpenAIAdapter);

// Basic check to see if createArtInstance can be called (without full config for brevity)
try {
    // This will throw due to missing config, but confirms the function exists
    // @ts-ignore - Intentionally omitting config for simple check
    createArtInstance({});
} catch (e: any) {
    if (e.message.includes("requires 'storage' configuration")) {
        console.log('createArtInstance function is present.');
    } else {
        console.error('Unexpected error with createArtInstance:', e);
    }
}
```

Then run it:

```bash
node test-art.js
# Or if using TypeScript with ts-node:
# npx ts-node test-art.ts
```

You should see output indicating successful imports and that `createArtInstance` exists. This is a basic check; the [Quick Start](./quick-start.md) guide will walk you through creating a runnable agent.

## Next Steps

With ART Framework installed, you're ready to start building your first agent!

*   **[Quick Start Guide](./quick-start.md):** A hands-on tutorial to create a simple "Hello, Agent!"
*   **[Project Setup](./project-setup.md):** Recommendations for structuring your ART project.