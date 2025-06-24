# 🍒 Cherry Changelog

Interactive changelog generator with commit picker. Choose which commits to include in your changelog with multiple output formats (JSON, Markdown, HTML). Perfect for teams who want full control over their release notes.

## Features

- 🎯 Interactive commit selection with checkboxes
- 📝 Supports conventional commits (feat, fix, perf)
- 📊 Multiple output formats: JSON, Markdown, HTML
- 🏷️ Automatic version detection from git tags
- 🔄 Updates existing versions or creates new ones


## Quick Start

Run the following in any project:

```bash
npx cherry-changelog
```

The tool will:

1. Scan your git commits for conventional commits
2. Show an interactive checkbox list for commit selection
3. Let you choose output formats (JSON, MD, HTML)
4. Generate changelog files with your selections

## Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--format` | `-f` | string | `markdown` | Export formats (comma-separated: json,markdown,html) |
| `--output` | `-o` | string | `.` | Output directory |
| `--version` | `-v` | string | - | Override version (defaults to latest git tag) |
| `--types` | `-t` | string | `feat,fix,perf` | Commit types to include (comma-separated) |
| `--auto-select` | `-a` | boolean | `false` | Auto-select all commits without prompting |
| `--input-file` | `-i` | string | `changelog.json` | Input changelog file |

### Examples

Generate multiple formats:

```bash
cherry-changelog --format json,markdown,html
```

Auto-select all commits:

```bash
cherry-changelog --auto-select
```

Specify custom version and output directory:

```bash
cherry-changelog --version v2.1.0 --output ./dist
```

Filter specific commit types:

```bash
cherry-changelog --types feat,fix
```

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

## License

MIT
