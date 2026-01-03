# Contributing to Chans SDK

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/chans-ai/chans-sdk-js.git
   cd chans-sdk-js
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build packages**
   ```bash
   pnpm build
   ```

4. **Run in dev mode** (watch for changes)
   ```bash
   pnpm dev
   ```

## Project Structure

```
chans-sdk-js/
├── client/          # @chans/sdk-js - Core JavaScript client
│   ├── src/
│   └── package.json
├── react/           # @chans/react - React components
│   ├── src/
│   └── package.json
└── package.json     # Root workspace config
```

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation if needed

3. **Build and test**
   ```bash
   pnpm build
   pnpm lint
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference issues if applicable: `Fix #123`

5. **Open a Pull Request**
   - Describe what your changes do
   - Link any related issues

## Code Style

- TypeScript with strict mode
- ESM modules
- Prefer `const` over `let`
- Use descriptive variable names

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

## Questions?

Open an issue or reach out at [support@chans.ai](mailto:support@chans.ai)
