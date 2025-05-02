# Installation Guide

This guide provides instructions on how to install the Agent Runtime (ART) Framework into your project.

## Prerequisites

Before installing the ART Framework, ensure you have the following prerequisites installed on your system:

*   **Node.js:** ART is a JavaScript/TypeScript framework and requires Node.js to run. We recommend using the latest LTS version. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm or yarn:** A package manager is required to install the framework. Node.js typically comes bundled with npm. You can also install yarn from [yarnpkg.com](https://yarnpkg.com/).

## Installation Steps

You can install the ART Framework using either npm or yarn:

**Using npm:**

```bash
npm install art-framework
```

**Using yarn:**

```bash
yarn add art-framework
```

This command will download and install the latest stable version of the ART Framework and its necessary dependencies into your project's `node_modules` directory and update your `package.json` file.

## Verifying Installation (Optional)

After installation, you can verify that the package is correctly installed by checking your `node_modules` directory for the `art-framework` folder or by looking for it in your `package.json` dependencies section.

You can also try importing a core component in a test file:

```typescript
// test-import.ts
import { createArtInstance } from 'art-framework';

console.log('ART Framework imported successfully:', typeof createArtInstance === 'function');
```

Run this file using `node test-import.js` (if compiled to JS) or `ts-node test-import.ts` (if using ts-node). It should log `true` if the import was successful.

## Next Steps

With the ART Framework installed, you can now proceed to the [Basic Usage Tutorial](./BasicUsage.md) to learn how to initialize the framework and run your first agent.