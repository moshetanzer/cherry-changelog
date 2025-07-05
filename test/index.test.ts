import type { ChangelogVersion } from '../src'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {

  exportChangelog,
  exportToHtml,
  exportToJson,
  exportToMarkdown,
  getCommits,
  loadChangelog,
  mapCommitType,
  parseConventionalCommit,

} from '../src'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('node:process', () => ({
  exit: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

describe('parseConventionalCommit', () => {
  it('parses conventional commit with type only', () => {
    const result = parseConventionalCommit('feat: add new feature')
    expect(result).toEqual({
      type: 'feat',
      scope: null,
      subject: 'add new feature',
      hash: '',
      raw: '',
      isConventional: true,
    })
  })

  it('parses conventional commit with type and scope', () => {
    const result = parseConventionalCommit('fix(auth): resolve login issue')
    expect(result).toEqual({
      type: 'fix',
      scope: 'auth',
      subject: 'resolve login issue',
      hash: '',
      raw: '',
      isConventional: true,
    })
  })

  it('handles non-conventional commit', () => {
    const result = parseConventionalCommit('random commit message')
    expect(result).toEqual({
      type: null,
      scope: null,
      subject: 'random commit message',
      hash: '',
      raw: '',
      isConventional: false,
    })
  })

  it('parses performance commit', () => {
    const result = parseConventionalCommit('perf: optimize database queries')
    expect(result).toEqual({
      type: 'perf',
      scope: null,
      subject: 'optimize database queries',
      hash: '',
      raw: '',
      isConventional: true,
    })
  })
})

describe('mapCommitType', () => {
  it('maps feat to feature', () => {
    expect(mapCommitType('feat')).toBe('feature')
  })

  it('maps fix to fix', () => {
    expect(mapCommitType('fix')).toBe('fix')
  })

  it('maps perf to performance', () => {
    expect(mapCommitType('perf')).toBe('performance')
  })

  it('maps unknown types to feature', () => {
    expect(mapCommitType('docs')).toBe('docs')
    expect(mapCommitType('chore')).toBe('chore')
    expect(mapCommitType('unknown')).toBe('feature')
  })
})

describe('loadChangelog', async () => {
  const { existsSync, readFileSync } = await import('node:fs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)

    const result = loadChangelog('changelog.json')
    expect(result).toEqual([])
  })

  it('loads and parses valid JSON changelog', () => {
    const mockChangelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [{ type: 'feature', text: 'Add new feature' }],
      },
    ]

    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockChangelog))

    const result = loadChangelog('changelog.json')
    expect(result).toEqual(mockChangelog)
  })

  it('returns empty array when JSON is invalid', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('invalid json')

    const result = loadChangelog('changelog.json')
    expect(result).toEqual([])
  })
})

describe('exportToJson', async () => {
  const { writeFileSync } = await import('node:fs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports changelog to JSON file', () => {
    const changelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [{ type: 'feature', text: 'Add feature' }],
      },
    ]

    exportToJson(changelog, 'changelog.json')

    expect(writeFileSync).toHaveBeenCalledWith(
      'changelog.json',
      JSON.stringify(changelog, null, 2),
    )
  })

  it('exports changelog to JSON file with custom filename', () => {
    const changelog: ChangelogVersion[] = []

    exportToJson(changelog, 'custom.json')

    expect(writeFileSync).toHaveBeenCalledWith(
      'custom.json',
      JSON.stringify(changelog, null, 2),
    )
  })
})

describe('exportToMarkdown', async () => {
  const { writeFileSync } = await import('node:fs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports changelog to markdown format', () => {
    const changelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [
          { type: 'feature', text: 'Add new feature' },
          { type: 'fix', text: 'Fix bug' },
        ],
      },
    ]

    exportToMarkdown(changelog, 'CHANGELOG.md')

    const expectedContent = `# Changelog

## v1.0.0 - 2023-01-01

### ✨ New Features

- Add new feature

### 🐛 Fixes

- Fix bug
`

    expect(writeFileSync).toHaveBeenCalledWith('CHANGELOG.md', expectedContent)
  })

  it('handles empty changelog', () => {
    exportToMarkdown([], 'CHANGELOG.md')

    expect(writeFileSync).toHaveBeenCalledWith('CHANGELOG.md', '# Changelog\n')
  })
})

describe('exportToHtml', async () => {
  const { writeFileSync } = await import('node:fs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports changelog to HTML format', () => {
    const changelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [{ type: 'feature', text: 'Add feature' }],
      },
    ]

    exportToHtml(changelog, 'changelog.html')

    const writtenContent = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string
    expect(writtenContent).toContain('<!DOCTYPE html>')
    expect(writtenContent).toContain('<title>Changelog</title>')
    expect(writtenContent).toContain('v1.0.0 - 2023-01-01')
    expect(writtenContent).toContain('Add feature')
    expect(writeFileSync).toHaveBeenCalledWith('changelog.html', expect.any(String))
  })
})

describe('exportChangelog', async () => {
  const { writeFileSync } = await import('node:fs')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports to multiple formats with default output directory', () => {
    const changelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [{ type: 'feature', text: 'Test feature' }],
      },
    ]

    exportChangelog(changelog, ['json', 'markdown'])

    expect(writeFileSync).toHaveBeenCalledTimes(2)
    expect(writeFileSync).toHaveBeenCalledWith(
      './changelog.json',
      expect.any(String),
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      './CHANGELOG.md',
      expect.any(String),
    )
  })

  it('exports to custom output directory', () => {
    const changelog: ChangelogVersion[] = [
      {
        version: 'v1.0.0',
        date: '2023-01-01',
        entries: [{ type: 'feature', text: 'Test feature' }],
      },
    ]

    exportChangelog(changelog, ['json'], 'build')

    expect(writeFileSync).toHaveBeenCalledWith(
      'build/changelog.json',
      expect.any(String),
    )
  })

  it('exports all formats with correct filenames', () => {
    const changelog: ChangelogVersion[] = []

    exportChangelog(changelog, ['json', 'markdown', 'html'], 'dist')

    expect(writeFileSync).toHaveBeenCalledTimes(3)
    expect(writeFileSync).toHaveBeenCalledWith('dist/changelog.json', expect.any(String))
    expect(writeFileSync).toHaveBeenCalledWith('dist/CHANGELOG.md', expect.any(String))
    expect(writeFileSync).toHaveBeenCalledWith('dist/changelog.html', expect.any(String))
  })

  it('logs success messages for each format with correct paths', () => {
    const changelog: ChangelogVersion[] = []

    exportChangelog(changelog, ['json', 'html'], 'output')

    expect(console.log).toHaveBeenCalledWith('✅ Exported to output/changelog.json')
    expect(console.log).toHaveBeenCalledWith('✅ Exported to output/changelog.html')
  })
})

describe('getCommits', async () => {
  const { execSync } = await import('node:child_process')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets commits since last tag when tag exists', () => {
    // Mock git describe to return a tag
    vi.mocked(execSync)
      .mockReturnValueOnce('v1.0.0')
      // Mock git log to return commits
      .mockReturnValueOnce(`abc123
feat: add new feature
Some body text
==END==def456
fix(auth): resolve login issue

==END==`)

    const result = getCommits()

    expect(execSync).toHaveBeenCalledWith('git describe --tags --abbrev=0', { encoding: 'utf8' })
    expect(execSync).toHaveBeenCalledWith('git log v1.0.0..HEAD --pretty=format:"%H%n%s%n%b%n==END=="', { encoding: 'utf8' })

    expect(result).toEqual([
      {
        type: 'feat',
        scope: null,
        subject: 'add new feature',
        hash: 'abc123',
        raw: 'abc123\nfeat: add new feature\nSome body text',
        isConventional: true,
      },
      {
        type: 'fix',
        scope: 'auth',
        subject: 'resolve login issue',
        hash: 'def456',
        raw: 'def456\nfix(auth): resolve login issue',
        isConventional: true,
      },
    ])
  })

  it('gets all commits when no tags exist', () => {
    // Mock git describe to throw (no tags)
    vi.mocked(execSync)
      .mockImplementationOnce(() => {
        throw new Error('No tags found')
      })
      // Mock git log to return commits
      .mockReturnValueOnce(`abc123
feat: initial commit

==END==`)

    const result = getCommits()

    expect(execSync).toHaveBeenCalledWith('git describe --tags --abbrev=0', { encoding: 'utf8' })
    expect(execSync).toHaveBeenCalledWith('git log --pretty=format:"%H%n%s%n%b%n==END=="', { encoding: 'utf8' })

    expect(result).toEqual([
      {
        type: 'feat',
        scope: null,
        subject: 'initial commit',
        hash: 'abc123',
        raw: 'abc123\nfeat: initial commit',
        isConventional: true,
      },
    ])
  })

  it('handles non-conventional commits', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce('v1.0.0')
      .mockReturnValueOnce(`abc123
random commit message

==END==`)

    const result = getCommits()

    expect(result).toEqual([
      {
        type: null,
        scope: null,
        subject: 'random commit message',
        hash: 'abc123',
        raw: 'abc123\nrandom commit message',
        isConventional: false,
      },
    ])
  })

  it('exits process when git log fails', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce('v1.0.0')
      .mockImplementationOnce(() => {
        throw new Error('Git log failed')
      })

    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => getCommits()).toThrow('process.exit called')
    expect(console.error).toHaveBeenCalledWith('Error reading git commits:', expect.any(Error))
  })

  it('filters out empty commits', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce('v1.0.0')
      .mockReturnValueOnce(`abc123
feat: add feature

==END==

==END==def456
fix: fix bug

==END==`)

    const result = getCommits()

    expect(result).toHaveLength(2)
    expect(result[0]?.subject).toBe('add feature')
    expect(result[1]?.subject).toBe('fix bug')
  })
})
