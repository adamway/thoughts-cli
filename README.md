# thoughts-cli

A standalone CLI tool for managing developer thoughts and notes across repositories. Thoughts are stored in a separate git repository, with symlinks into your code repos, git hooks for protection/auto-sync, and a profile system for multiple contexts.

Zero dependencies on any cloud API — purely local filesystem + git.

## How It Works

```
~/thoughts/                          # Your thoughts repository (git-tracked)
├── repos/
│   ├── project-a/
│   │   ├── alice/                   # Alice's personal notes
│   │   └── shared/                  # Team notes
│   └── project-b/
│       ├── alice/
│       └── shared/
└── global/                          # Cross-project notes
    ├── alice/
    └── shared/

~/code/project-a/                    # Your code repository
└── thoughts/                        # Symlinks (never committed to code repo)
    ├── alice/      → ~/thoughts/repos/project-a/alice/
    ├── shared/     → ~/thoughts/repos/project-a/shared/
    ├── global/     → ~/thoughts/global/
    └── searchable/ # Hard links for IDE search
```

- A **pre-commit hook** prevents accidentally committing `thoughts/` to your code repo
- A **post-commit hook** auto-syncs your thoughts after each code commit
- A **searchable directory** with hard links lets your IDE search across all thoughts

## Installation

### Prerequisites

- Node.js >= 16
- git

### Install globally from source

```bash
git clone https://github.com/adamway/thoughts-cli.git
cd thoughts-cli
npm install
npm run build
npm link
```

You can now use `thoughts-cli` from anywhere:

```bash
thoughts-cli --help
```

### Run without installing globally

```bash
cd thoughts-cli
npm install
npm run build
./dist/index.js --help
```

### Uninstall

```bash
cd thoughts-cli
npm unlink -g
```

## Quick Start

### First-time setup

Run `init` inside any git repository. The first time you run it, you'll be walked through the global setup (thoughts repo location, username, directory names):

```bash
cd ~/code/my-project
thoughts-cli init
```

This will:

1. Create your thoughts repository (default: `~/thoughts/`)
2. Set up the directory structure for this project
3. Create symlinks in `my-project/thoughts/`
4. Install git hooks for protection and auto-sync
5. Save your configuration to `~/.config/humanlayer/humanlayer.json`

### Create notes

```bash
# Your personal notes for this repo
echo "# Architecture Notes" > thoughts/<your-username>/architecture.md

# Shared team notes
echo "# Decisions" > thoughts/shared/decisions.md

# Cross-project notes
echo "# General TODO" > thoughts/global/<your-username>/todo.md
```

### Sync manually

```bash
thoughts-cli sync
```

This commits and pushes changes in your thoughts repo and rebuilds the searchable index. Syncing also happens automatically after each code commit via the post-commit hook.

### Check status

```bash
thoughts-cli status
```

## Re-linking to an Existing Thoughts Repository

If you already have a thoughts repository (e.g. cloned from GitHub) with existing project directories, you need to re-link your code repos to those directories. This is common when:

- Setting up on a new machine
- Re-cloning code repositories
- Recovering after removing thoughts setup

### Step 1: Clone your thoughts repo

```bash
git clone git@github.com:you/thoughts.git ~/thoughts
```

### Step 2: First repo — configure and link

For the first code repository, run `init`. If you don't yet have a config file, you'll go through the initial setup. Point it to your existing thoughts repo:

```bash
cd ~/code/my-first-project
thoughts-cli init
```

When prompted:

- **Thoughts repository location**: enter the path to your cloned repo (e.g. `~/thoughts`)
- **Directory names**: use the same names as your existing repo (typically `repos` and `global`)
- **Repository directory**: select the existing directory from the list (e.g. "Use existing: my-first-project")

### Step 3: Link remaining repos

For each additional code repository, run `init` and select the matching existing directory:

```bash
cd ~/code/another-project
thoughts-cli init
```

The interactive prompt will list all existing directories in your thoughts repo — just select the right one.

### Non-interactive re-linking

Use the `--directory` flag to skip prompts. The directory must already exist in your thoughts repo:

```bash
cd ~/code/my-project
thoughts-cli init --directory my-project
```

### Batch re-linking

To re-link many repos at once, script it:

```bash
# List what's available in your thoughts repo
ls ~/thoughts/repos/

# Re-link each one
cd ~/code/project-a && thoughts-cli init --directory project-a
cd ~/code/project-b && thoughts-cli init --directory project-b
cd ~/code/project-c && thoughts-cli init --directory project-c
```

### Re-linking with profiles

If you use profiles (e.g. separate work and personal thoughts repos):

```bash
# Re-create the profile first
thoughts-cli profile create work --repo ~/thoughts-work --repos-dir repos --global-dir global

# Then init with the profile
cd ~/code/work-project
thoughts-cli init --profile work --directory work-project
```

## Profiles

Profiles let you maintain separate thoughts repositories for different contexts (work, personal, client projects).

### Create a profile

```bash
thoughts-cli profile create work
# Interactive: prompts for repo path and directory names

# Or non-interactive:
thoughts-cli profile create work --repo ~/thoughts-work --repos-dir repos --global-dir global
```

### Use a profile when initializing

```bash
cd ~/code/work-project
thoughts-cli init --profile work
```

### Manage profiles

```bash
thoughts-cli profile list
thoughts-cli profile show work
thoughts-cli profile delete work
```

## Command Reference

| Command                              | Description                                |
| ------------------------------------ | ------------------------------------------ |
| `thoughts-cli init`                  | Initialize thoughts for the current repo   |
| `thoughts-cli uninit`                | Remove thoughts setup (content stays safe) |
| `thoughts-cli sync`                  | Manually sync and rebuild searchable index |
| `thoughts-cli status`                | Show thoughts repo and sync status         |
| `thoughts-cli config`                | View configuration                         |
| `thoughts-cli config --edit`         | Open config in `$EDITOR`                   |
| `thoughts-cli config --json`         | Output config as JSON                      |
| `thoughts-cli profile create <name>` | Create a new profile                       |
| `thoughts-cli profile list`          | List all profiles                          |
| `thoughts-cli profile show <name>`   | Show profile details                       |
| `thoughts-cli profile delete <name>` | Delete a profile                           |

### Common flags

| Flag                   | Commands                     | Description                                     |
| ---------------------- | ---------------------------- | ----------------------------------------------- |
| `--config-file <path>` | all                          | Use a custom config file path                   |
| `--force`              | init, uninit, profile delete | Force the operation                             |
| `--directory <name>`   | init                         | Skip interactive prompt, use existing directory |
| `--profile <name>`     | init                         | Use a specific profile                          |
| `-m, --message <msg>`  | sync                         | Custom commit message                           |
| `--json`               | config, profile list/show    | Output as JSON                                  |

## Configuration

Configuration is stored at `~/.config/humanlayer/humanlayer.json` (respects `XDG_CONFIG_HOME`).

Example:

```json
{
  "thoughts": {
    "thoughtsRepo": "~/thoughts",
    "reposDir": "repos",
    "globalDir": "global",
    "user": "alice",
    "repoMappings": {
      "/home/alice/code/project-a": "project-a",
      "/home/alice/code/work-proj": { "repo": "work-proj", "profile": "work" }
    },
    "profiles": {
      "work": {
        "thoughtsRepo": "~/thoughts-work",
        "reposDir": "projects",
        "globalDir": "shared"
      }
    }
  }
}
```

## Development

```bash
npm install
make check    # Format + lint + test + build
make test     # Run tests only
make build    # Build only
make lint     # Lint only
make format   # Format code
```

## License

Apache-2.0
