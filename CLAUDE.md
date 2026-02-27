# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**thoughts-cli** is a standalone CLI tool for managing developer thoughts and notes across repositories. It stores thoughts in a separate git repository, with symlinks into code repos, git hooks for protection/auto-sync, and a profile system for multiple contexts.

This tool has **zero dependencies** on HumanLayer SDK, MCP, or any cloud API — it is purely local filesystem + git.

## Architecture

- `src/index.ts` — CLI entry point using Commander.js. Commands are registered at the top level (`thoughts-cli init`, not nested under a subcommand).
- `src/config.ts` — Config file I/O. Reads/writes `~/.config/humanlayer/humanlayer.json` (XDG_CONFIG_HOME aware).
- `src/thoughtsConfig.ts` — Thoughts-specific config logic: profile resolution, repo mapping, directory management.
- `src/commands/` — Command implementations: init, uninit, sync, status, config.
- `src/commands/profile/` — Profile CRUD: create, list, show, delete.

### Key Concepts

- **Thoughts repo**: A separate git repository that stores developer notes/thoughts.
- **Symlinks**: Each code repo gets a `thoughts/` symlink pointing into the thoughts repo.
- **Git hooks**: Pre-commit hook blocks accidental commits of `thoughts/` content. Post-commit hook auto-syncs.
- **Profiles**: Named configurations for different thoughts repositories (e.g., work vs personal).
- **Searchable directory**: Hard-linked copies of thoughts for IDE search integration.

## Development Commands

### Quick Actions

- `make check` — Run all quality checks (format + lint + test + build)
- `make test` — Run tests
- `make build` — Build TypeScript source
- `make lint` — Run ESLint
- `make format` — Format code with Prettier

### Build & Run

- `npm install` — Install dependencies
- `npm run build` — Build with tsup (output: `dist/index.js`)
- `npm run dev` — Build and run the CLI
- `./dist/index.js --help` — Run built CLI

### Testing

- `npm run test` — Run vitest
- `npm run test:watch` — Run vitest in watch mode

## Technical Details

- **Runtime**: Node.js >= 16
- **Module system**: ESM (`"type": "module"`)
- **Bundler**: tsup
- **Test framework**: vitest
- **Linter**: ESLint + Prettier
- **Dependencies**: chalk, commander, dotenv (only 3 runtime deps)

## Development Conventions

### TODO Annotations

- `TODO(0)`: Critical - never merge
- `TODO(1)`: High - architectural flaws, major bugs
- `TODO(2)`: Medium - minor bugs, missing features
- `TODO(3)`: Low - polish, tests, documentation
- `TODO(4)`: Questions/investigations needed
