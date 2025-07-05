#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import inquirer from 'inquirer'

interface ParsedCommit {
  type: string | null
  scope: string | null
  subject: string
  hash: string
  raw: string
  isConventional: boolean
}

interface ChangelogEntry {
  type: 'feature' | 'fix' | 'performance' | 'chore' | 'docs' | 'style' | 'refactor' | 'test' | 'build' | 'ci'
  text: string
}

interface ChangelogVersion {
  version: string
  date: string
  entries: ChangelogEntry[]
}

type ExportFormat = 'json' | 'markdown' | 'html'

function parseConventionalCommit(message: string): ParsedCommit {
  const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\([^)]+\))?: (.+)$/
  const match = message.match(conventionalPattern)

  if (match) {
    return {
      type: match[1] ?? null,
      scope: match[2] ? match[2].slice(1, -1) : null,
      subject: match[3] ?? '',
      hash: '',
      raw: '',
      isConventional: true,
    }
  }

  return {
    type: null,
    scope: null,
    subject: message,
    hash: '',
    raw: '',
    isConventional: false,
  }
}
function getCommits(): ParsedCommit[] {
  try {
    // Get the last tag
    let lastTag = ''
    try {
      lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
    }
    catch {
      // If no tags exist, get all commits
      lastTag = ''
    }

    // Build the git log command - get commits since last tag
    const gitLogCommand = lastTag
      ? `git log ${lastTag}..HEAD --pretty=format:"%H%n%s%n%b%n==END=="`
      : 'git log --pretty=format:"%H%n%s%n%b%n==END=="'

    const rawOutput = execSync(gitLogCommand, { encoding: 'utf8' }) || ''
    const rawCommits = rawOutput.split('==END==')
      .map(str => str.trim())
      .filter(Boolean)

    return rawCommits.map((commit) => {
      const lines = commit.split('\n')
      const hash = lines[0] || ''
      const subject = lines[1] || ''

      const result = parseConventionalCommit(subject)

      return {
        ...result,
        hash,
        raw: commit,
      }
    })
  }
  catch (error) {
    console.error('Error reading git commits:', error)
    process.exit(1)
  }
}

function getVersion(): string {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
  }
  catch {
    return 'v0.1.0'
  }
}

function loadChangelog(file: string): ChangelogVersion[] {
  if (!existsSync(file)) {
    return []
  }

  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  }
  catch {
    return []
  }
}

function mapCommitType(type: string): 'feature' | 'fix' | 'performance' | 'chore' | 'docs' | 'style' | 'refactor' | 'test' | 'build' | 'ci' {
  switch (type) {
    case 'feat': return 'feature'
    case 'fix': return 'fix'
    case 'perf': return 'performance'
    case 'chore': return 'chore'
    case 'docs': return 'docs'
    case 'style': return 'style'
    case 'refactor': return 'refactor'
    case 'test': return 'test'
    case 'build': return 'build'
    case 'ci': return 'ci'
    default: return 'feature'
  }
}

function exportToJson(changelog: ChangelogVersion[], filename: string): void {
  writeFileSync(filename, JSON.stringify(changelog, null, 2))
}

function exportToMarkdown(changelog: ChangelogVersion[], filename: string): void {
  let content = '# Changelog\n\n'

  changelog.forEach((version) => {
    content += `## ${version.version} - ${version.date}\n\n`

    const groupedEntries = version.entries.reduce((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = []
      }
      acc[entry.type]!.push(entry)
      return acc
    }, {} as Record<string, ChangelogEntry[]>)

    const orderedTypes = ['feature', 'fix', 'performance']
    const sortedEntries = Object.entries(groupedEntries).sort(([a], [b]) => {
      const aIndex = orderedTypes.indexOf(a)
      const bIndex = orderedTypes.indexOf(b)

      return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
    })

    sortedEntries.forEach(([type, entries]) => {
      const typeTitleMap: Record<string, string> = {
        feature: '✨ New Features',
        fix: '🐛 Fixes',
        performance: '⚡ Performance',
      }
      const typeTitle = typeTitleMap[type] || '📦 Other'
      content += `### ${typeTitle}\n\n`
      entries.forEach((entry) => {
        content += `- ${entry.text}\n`
      })
      content += '\n'
    })
  })

  writeFileSync(filename, `${content.trimEnd()}\n`)
}

function exportToHtml(changelog: ChangelogVersion[], filename: string): void {
  let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Changelog</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        h3 { color: #666; margin-top: 20px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        .version { margin-bottom: 30px; }
        .feature { color: #28a745; }
        .fix { color: #dc3545; }
        .performance { color: #fd7e14; }
        .other { color: #6c757d; font-style: italic; }
    </style>
</head>
<body>
    <h1>Changelog</h1>
`

  changelog.forEach((version) => {
    content += `    <div class="version">
        <h2>${version.version} - ${version.date}</h2>
`

    const groupedEntries = version.entries.reduce((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = []
      }
      acc[entry.type]!.push(entry)
      return acc
    }, {} as Record<string, ChangelogEntry[]>)

    const typeTitleMap: Record<string, string> = {
      feature: '✨ New Features',
      fix: '🐛 Fixes',
      performance: '⚡ Performance',
    }

    const orderedTypes = ['feature', 'fix', 'performance']
    const sortedEntries = Object.entries(groupedEntries).sort(([a], [b]) => {
      const aIndex = orderedTypes.indexOf(a)
      const bIndex = orderedTypes.indexOf(b)
      return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
    })

    sortedEntries.forEach(([type, entries]) => {
      const cssClass = orderedTypes.includes(type) ? type : 'other'
      const typeTitle = typeTitleMap[type] || '📦 Other'
      content += `        <h3 class="${cssClass}">${typeTitle}</h3>
        <ul>
`
      entries.forEach((entry) => {
        content += `            <li>${entry.text}</li>
`
      })
      content += `        </ul>
`
    })

    content += `    </div>
`
  })

  content += `</body>
</html>`

  writeFileSync(filename, content)
}

function exportChangelog(changelog: ChangelogVersion[], formats: ExportFormat[], outputDir: string = '.'): void {
  formats.forEach((format) => {
    const filename = `${outputDir}/${format === 'json' ? 'changelog.json' : format === 'markdown' ? 'CHANGELOG.md' : 'changelog.html'}`

    switch (format) {
      case 'json':
        exportToJson(changelog, filename)
        console.log(`✅ Exported to ${filename}`)
        break
      case 'markdown':
        exportToMarkdown(changelog, filename)
        console.log(`✅ Exported to ${filename}`)
        break
      case 'html':
        exportToHtml(changelog, filename)
        console.log(`✅ Exported to ${filename}`)
        break
    }
  })
}

const main = defineCommand({
  meta: {
    name: 'changelog-generator',
    version: '1.0.0',
    description: 'Generate changelog from conventional commits',
  },
  args: {
    'format': {
      type: 'string',
      description: 'Export formats (comma-separated)',
      default: 'markdown',
      alias: 'f',
    },
    'output': {
      type: 'string',
      description: 'Output directory',
      default: '.',
      alias: 'o',
    },
    'version': {
      type: 'string',
      description: 'Override version (defaults to latest git tag)',
      alias: 'v',
    },
    'types': {
      type: 'string',
      description: 'Commit types to include (comma-separated)',
      default: 'feat,fix,perf',
      alias: 't',
    },
    'auto-select': {
      type: 'boolean',
      description: 'Auto-select all commits without prompting',
      default: false,
      alias: 'a',
    },
    'input-file': {
      type: 'string',
      description: 'Input changelog file',
      default: 'changelog.json',
      alias: 'i',
    },
  },
  async run({ args }) {
    console.log('🔍 Scanning git commits...')

    const commits = getCommits()
    const allowedTypes = args.types.split(',').map(t => t.trim())
    const formats = args.format.split(',').map(f => f.trim()) as ExportFormat[]

    const validFormats = formats.filter(f => ['json', 'markdown', 'html'].includes(f))
    if (validFormats.length === 0) {
      console.error('❌ Invalid format(s). Use: json, markdown, html')
      process.exit(1)
    }

    const filteredCommits = commits.filter(commit =>
      allowedTypes.includes(commit.type || ''),
    )

    if (filteredCommits.length === 0) {
      console.log(`⚠️  No conventional commits found for types: ${allowedTypes.join(', ')}`)
      console.log('💡 Make sure your commits follow the format: type: description')
      process.exit(0)
    }

    let selectedCommits: ChangelogEntry[]

    if (args['auto-select']) {
      selectedCommits = filteredCommits.map(commit => ({
        type: mapCommitType(commit.type!),
        text: commit.subject,
      }))
      console.log(`✅ Auto-selected all ${selectedCommits.length} commits`)
    }
    else {
      const choices = filteredCommits.map((commit, index) => ({
        name: `[${mapCommitType(commit.type!)}] ${commit.subject} (${commit.hash.substring(0, 8)})`,
        value: index,
        checked: false,
      }))

      const { selectedIndices } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedIndices',
          message: 'Select commits to include in changelog:',
          choices,
          pageSize: 10,
        },
      ])

      if (selectedIndices.length === 0) {
        console.log('⚠️  No commits selected, changelog not updated')
        process.exit(0)
      }

      selectedCommits = selectedIndices.map((index: number) => {
        const commit = filteredCommits[index]
        if (!commit) {
          throw new Error(`Commit at index ${index} is undefined`)
        }
        return {
          type: mapCommitType(commit.type!),
          text: commit.subject,
        }
      })
    }

    const version = args.version || getVersion()
    const date = new Date().toISOString().split('T')[0] || ''
    const changelog = loadChangelog(args['input-file'])

    const existingVersionIndex = changelog.findIndex(entry => entry.version === version)
    const newEntry: ChangelogVersion = {
      version,
      date,
      entries: selectedCommits,
    }

    if (existingVersionIndex >= 0) {
      changelog[existingVersionIndex] = newEntry
      console.log(`✅ Updated existing version ${version} in changelog`)
    }
    else {
      changelog.unshift(newEntry)
      console.log(`✅ Added new version ${version} to changelog`)
    }

    exportChangelog(changelog, validFormats, args.output)

    console.log(`📝 Added ${selectedCommits.length} selected commits to changelog`)
    selectedCommits.forEach((entry) => {
      console.log(`  • ${entry.type}: ${entry.text}`)
    })
  },
})

runMain(main)

export {
  exportChangelog,
  exportToHtml,
  exportToJson,
  exportToMarkdown,
  getCommits,
  loadChangelog,
  mapCommitType,
  parseConventionalCommit,
}

export type { ChangelogEntry, ChangelogVersion, ExportFormat, ParsedCommit }
