#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
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
  type: 'feature' | 'fix' | 'performance'
  text: string
}

interface ChangelogVersion {
  version: string
  date: string
  entries: ChangelogEntry[]
}

function parseConventionalCommit(message: string): ParsedCommit {
  const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\([^)]+\))?: (.+)$/
  const match = message.match(conventionalPattern)

  if (match) {
    return {
      type: match[1],
      scope: match[2] ? match[2].slice(1, -1) : null,
      subject: match[3],
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
    const rawCommits = execSync('git log --pretty=format:"%H%n%s%n%b%n==END=="', { encoding: 'utf8' })
      .split('==END==')
      .map(str => str.trim())
      .filter(Boolean)

    return rawCommits.map((commit) => {
      const lines = commit.split('\n')
      const hash = lines[0]
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

function mapCommitType(type: string): 'feature' | 'fix' | 'performance' {
  switch (type) {
    case 'feat': return 'feature'
    case 'fix': return 'fix'
    case 'perf': return 'performance'
    default: return 'feature'
  }
}

async function main() {
  console.log('🔍 Scanning git commits...')

  const commits = getCommits()
  const allowedTypes = ['feat', 'fix', 'perf']
  const filteredCommits = commits.filter(commit =>
    allowedTypes.includes(commit.type || ''),
  )

  if (filteredCommits.length === 0) {
    console.log('⚠️  No conventional commits found for types: feat, fix, perf')
    console.log('💡 Make sure your commits follow the format: type: description')
    process.exit(0)
  }

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

  const selectedCommits: ChangelogEntry[] = selectedIndices.map((index: number) => {
    const commit = filteredCommits[index]
    return {
      type: mapCommitType(commit.type!),
      text: commit.subject,
    }
  })

  const version = getVersion()
  const date = new Date().toISOString().split('T')[0]
  const changelog = loadChangelog('changelog.json')

  const existingVersionIndex = changelog.findIndex(entry => entry.version === version)
  const newEntry: ChangelogVersion = {
    version,
    date,
    entries: selectedCommits,
  }

  if (existingVersionIndex >= 0) {
    changelog[existingVersionIndex] = newEntry
    console.log(`✅ Updated existing version ${version} in changelog.json`)
  }
  else {
    changelog.unshift(newEntry)
    console.log(`✅ Added new version ${version} to changelog.json`)
  }

  writeFileSync('changelog.json', JSON.stringify(changelog, null, 2))
  console.log(`📝 Added ${selectedCommits.length} selected commits to changelog`)

  selectedCommits.forEach((entry) => {
    console.log(`  • ${entry.type}: ${entry.text}`)
  })
}

main().catch(console.error)
