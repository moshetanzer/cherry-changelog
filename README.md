# changelog-pick

Interactive changelog generator with JSON, Markdown, and HTML output. Perfect for teams who want full control over which commits make it into their changelog.

## Features

- 🎯 Interactive commit selection with checkboxes
- 📝 Supports conventional commits (feat, fix, perf)
- 📊 Multiple output formats: JSON, Markdown, HTML
- 🏷️ Automatic version detection from git tags
- 🔄 Updates existing versions or creates new ones

## Installation

```bash
npm install -g changelog-pick
```

Or use with npx:

```bash
npx changelog-pick
```

## Usage

In your git repository:

```bash
changelog-pick
```

Or with npx:

```bash
npx changelog-pick
```

The tool will:
1. Scan your git commits for conventional commits
2. Show an interactive checkbox list for commit selection
3. Let you choose output formats (JSON, MD, HTML)
4. Generate changelog files with your selections

## Output Formats

### JSON
```json
[
  {
    "version": "v1.2.0",
    "date": "2025-06-23",
    "entries": [
      {
        "type": "feature",
        "text": "add user authentication"
      },
      {
        "type": "fix",
        "text": "resolve memory leak"
      }
    ]
  }
]
```

### Markdown
```markdown
# Changelog

## v1.2.0 - 2025-06-23

### ✨ Features
- add user authentication

### 🐛 Fixes
- resolve memory leak
```

### HTML
Clean, responsive HTML with built-in styling for easy sharing.

## Supported Commit Types

- `feat:` → `feature`
- `fix:` → `fix`
- `perf:` → `performance`

## Requirements

- Git repository
- Conventional commits in your history
- Node.js 16+

## License

MIT
