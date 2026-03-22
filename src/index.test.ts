import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCommits, loadChangelog, mapCommitType, parseConventionalCommit } from './index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpGitRepo(): string {
  const dir = join(tmpdir(), `cherry-changelog-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  execSync('git init', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  return dir
}

function addCommit(dir: string, message: string): void {
  execSync(`git commit --allow-empty -m "${message}"`, { cwd: dir })
}

function addTag(dir: string, tag: string): void {
  execSync(`git tag ${tag}`, { cwd: dir })
}

function removeTmpDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// parseConventionalCommit
// ---------------------------------------------------------------------------

describe('parseConventionalCommit', () => {
  it('parses feat commit', () => {
    const result = parseConventionalCommit('feat: add new feature')
    expect(result.type).toBe('feat')
    expect(result.subject).toBe('add new feature')
    expect(result.isConventional).toBe(true)
  })

  it('parses fix commit with scope', () => {
    const result = parseConventionalCommit('fix(auth): fix login bug')
    expect(result.type).toBe('fix')
    expect(result.scope).toBe('auth')
    expect(result.subject).toBe('fix login bug')
  })

  it('returns non-conventional for plain message', () => {
    const result = parseConventionalCommit('just some commit')
    expect(result.isConventional).toBe(false)
    expect(result.type).toBeNull()
    expect(result.subject).toBe('just some commit')
  })
})

// ---------------------------------------------------------------------------
// mapCommitType
// ---------------------------------------------------------------------------

describe('mapCommitType', () => {
  it.each([
    ['feat', 'feature'],
    ['fix', 'fix'],
    ['perf', 'performance'],
    ['chore', 'chore'],
    ['docs', 'docs'],
    ['style', 'style'],
    ['refactor', 'refactor'],
    ['test', 'test'],
    ['build', 'build'],
    ['ci', 'ci'],
    ['unknown', 'feature'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapCommitType(input)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// loadChangelog
// ---------------------------------------------------------------------------

describe('loadChangelog', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `changelog-load-test-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => removeTmpDir(dir))

  it('returns empty array when file does not exist', () => {
    expect(loadChangelog(join(dir, 'nonexistent.json'))).toEqual([])
  })

  it('returns empty array for malformed JSON', () => {
    const file = join(dir, 'changelog.json')
    writeFileSync(file, 'not-valid-json')
    expect(loadChangelog(file)).toEqual([])
  })

  it('loads valid changelog JSON', () => {
    const data = [{ version: 'v1.0.0', date: '2024-01-01', entries: [] }]
    const file = join(dir, 'changelog.json')
    writeFileSync(file, JSON.stringify(data))
    expect(loadChangelog(file)).toEqual(data)
  })
})

// ---------------------------------------------------------------------------
// getCommits – the core of the bug fix
// ---------------------------------------------------------------------------

describe('getCommits', () => {
  let repoDir: string
  const origCwd = process.cwd()

  beforeEach(() => {
    repoDir = makeTmpGitRepo()
    process.chdir(repoDir)
  })

  afterEach(() => {
    process.chdir(origCwd)
    removeTmpDir(repoDir)
  })

  it('returns all commits when there are no tags', () => {
    addCommit(repoDir, 'feat: initial feature')
    addCommit(repoDir, 'fix: quick fix')

    const commits = getCommits()
    expect(commits.length).toBe(2)
  })

  it('returns commits since the provided sinceRef tag', () => {
    addCommit(repoDir, 'feat: initial feature')
    addTag(repoDir, 'v1.0.0')
    addCommit(repoDir, 'feat: second feature')
    addCommit(repoDir, 'fix: second fix')

    // Without sinceRef – falls back to latest tag (v1.0.0), so 2 commits returned
    const commitsSinceTag = getCommits()
    expect(commitsSinceTag.length).toBe(2)

    // With explicit sinceRef same as latest tag – same result
    const commitsSinceRef = getCommits('v1.0.0')
    expect(commitsSinceRef.length).toBe(2)
  })

  // -------------------------------------------------------------------
  // THE KEY BUG FIX SCENARIO
  // -------------------------------------------------------------------
  it('uses changelog sinceRef instead of latest git tag so new tag version gets the correct commits', () => {
    // Simulate: v1.0.0 already exists in changelog.json, user runs bumpp
    // (which creates v1.1.0 tag at HEAD). Without the fix, getCommits would
    // use v1.1.0 as sinceRef → 0 results. With the fix, the caller passes
    // v1.0.0 (from the existing changelog), so commits between v1.0.0 and
    // HEAD (= v1.1.0) are returned.
    addCommit(repoDir, 'feat: v1.0.0 work')
    addTag(repoDir, 'v1.0.0')
    addCommit(repoDir, 'feat: v1.1.0 feature')
    addCommit(repoDir, 'fix: v1.1.0 fix')
    addTag(repoDir, 'v1.1.0')

    // Without sinceRef: latest tag is v1.1.0, HEAD is at v1.1.0 → no commits
    const withoutSinceRef = getCommits()
    expect(withoutSinceRef.length).toBe(0)

    // With sinceRef from existing changelog (v1.0.0): commits since v1.0.0 → 2
    const withSinceRef = getCommits('v1.0.0')
    expect(withSinceRef.length).toBe(2)
    // git returns newest first
    const subjects = withSinceRef.map(c => c.subject)
    expect(subjects).toContain('v1.1.0 feature')
    expect(subjects).toContain('v1.1.0 fix')
  })

  it('falls back to latest git tag when sinceRef does not exist in git', () => {
    addCommit(repoDir, 'feat: initial feature')
    addTag(repoDir, 'v1.0.0')
    addCommit(repoDir, 'feat: new feature')

    // 'v0.0.1' doesn't exist in git → should fall back to latest tag (v1.0.0)
    const commits = getCommits('v0.0.1')
    expect(commits.length).toBe(1)
    expect(commits[0]?.subject).toBe('new feature')
  })
})
