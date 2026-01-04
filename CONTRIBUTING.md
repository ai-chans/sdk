# Contributing to Chans SDK

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/chozzz/chans-sdk.git
cd chans-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode (rebuilds on changes)
pnpm dev
```

## Project Structure

```
chans-sdk/
├── client/           # @chozzz/chans-sdk-js
│   ├── src/
│   └── package.json
├── react/            # @chozzz/chans-sdk-react
│   ├── src/
│   └── package.json
├── .github/
│   └── workflows/    # CI/CD
└── package.json      # Workspace root
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow existing code style
- Add tests where applicable
- Update documentation if needed

### 3. Build and Lint

```bash
pnpm build
pnpm lint
```

### 4. Commit

Use clear, descriptive commit messages:

```bash
git commit -m "Add feature X"
```

Reference issues if applicable: `Fix #123`

### 5. Open a Pull Request

- Describe what your changes do
- Link related issues
- Wait for CI to pass

## Code Style

- TypeScript with strict mode
- ESM modules
- Prefer `const` over `let`
- Use descriptive variable names
- No unused imports or variables

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

Version bumps are handled by maintainers.

## Releasing

Releases are automated via GitHub Actions. When a version bump is pushed to `main`, the workflow:

1. Creates a GitHub Release
2. Publishes to GitHub Packages

## Questions?

- Open an issue for bugs or feature requests
- Email [support@chans.ai](mailto:support@chans.ai) for other questions
