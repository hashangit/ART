# Contributing to ART Framework

Thank you for your interest in contributing to the ART (Agent-Reasoning-Tooling) Framework! We welcome contributions from the community to help make ART better. Whether it's bug reports, feature requests, documentation improvements, or code contributions, your help is appreciated.

## Ways to Contribute

*   **Reporting Bugs:** If you find a bug, please open an issue on our GitHub repository. Include a clear description, steps to reproduce, your environment details (OS, Node.js version, ART version), and any relevant error messages or logs.
*   **Suggesting Enhancements:** Have an idea for a new feature or an improvement to an existing one? Open an issue to discuss it. Provide a clear explanation of the feature and its potential benefits.
*   **Improving Documentation:** Good documentation is crucial. If you find areas that are unclear, incorrect, or missing, please let us know by opening an issue or, even better, submitting a pull request with your suggested changes.
*   **Writing Code:**
    *   **Bug Fixes:** If you've fixed a bug, submit a pull request with your changes.
    *   **New Features:** It's best to discuss new features in an issue first to ensure they align with the project's goals and roadmap before you invest significant time in implementation.
    *   **New Adapters:** Adding support for new LLM providers or storage backends is a valuable contribution.
    *   **New Tools:** Contributing useful, general-purpose tools.
*   **Writing Tests:** Improving test coverage helps ensure the stability and reliability of the framework.
*   **Providing Feedback:** Share your experiences using ART. What do you like? What could be better? What challenges are you facing?

## Development Setup (Conceptual)

1.  **Fork & Clone:** Fork the official ART Framework repository on GitHub and then clone your fork locally.
    ```bash
    git clone https://github.com/YOUR_USERNAME/art-framework.git
    cd art-framework
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Branching:** Create a new branch for your changes:
    ```bash
    git checkout -b feature/my-new-feature
    # or
    git checkout -b fix/issue-123
    ```
4.  **Making Changes:**
    *   Write your code, following the existing coding style and conventions.
    *   Ensure your code is well-commented, especially public APIs (use TSDoc).
    *   Add or update unit tests for your changes in the relevant `*.test.ts` files.
    *   Update documentation if your changes affect public APIs or behavior.
5.  **Testing:** Run the test suite to ensure your changes haven't introduced regressions:
    ```bash
    npm test
    # or
    yarn test
    ```
6.  **Linting & Formatting:** Ensure your code adheres to the project's linting and formatting rules (e.g., using ESLint, Prettier).
    ```bash
    npm run lint
    npm run format # (Or similar scripts defined in package.json)
    ```
7.  **Building (if applicable):**
    ```bash
    npm run build
    # or
    yarn build
    ```

## Pull Request Guidelines

1.  **Keep PRs Focused:** Each pull request should address a single bug or feature. Avoid mixing unrelated changes.
2.  **Base on `main` (or `develop`):** Ensure your branch is based on the latest version of the project's main development branch. Rebase your branch if necessary before submitting.
3.  **Clear Commit Messages:** Write clear and concise commit messages explaining the "what" and "why" of your changes.
4.  **Link to Issues:** If your PR addresses an existing issue, reference it in the PR description (e.g., "Fixes #123").
5.  **Detailed PR Description:** Explain the changes you've made, the problem they solve, and any relevant context. If it's a new feature, explain its usage.
6.  **Tests:** Include new tests for new features or bug fixes. Ensure all tests pass.
7.  **Documentation:** Update any relevant documentation (code comments, Markdown files).
8.  **Code Review:** Be prepared for feedback and discussion during the code review process.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms. (If a CODE_OF_CONDUCT.md file exists, link to it here).

## Questions?

If you have questions about contributing, feel free to open an issue or reach out through the project's designated communication channels (if any).

We look forward to your contributions!