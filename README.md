# 🍒 Cherry Changelog

Interactive changelog generator with commit picker. Choose which commits to include in your changelog with multiple output formats (JSON, Markdown, HTML). Perfect for teams who want full control over their release notes.

## Features

- 🎯 Interactive commit selection with checkboxes
- 📝 Supports conventional commits (feat, fix, perf)
- 📊 Multiple output formats: JSON, Markdown, HTML
- 🏷️ Automatic version detection from git tags
- 🔄 Updates existing versions or creates new ones

## Installation

```bash
npm install -g cherry-changelog
```

Or use with npx:

```bash
npx cherry-changelog
```

## Usage

In your repository:

```bash
cherry-changelog
```

Or with npx:

```bash
npx cherry-changelog
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

## License

MIT
