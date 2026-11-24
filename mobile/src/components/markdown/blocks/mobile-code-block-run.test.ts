import { describe, expect, it } from 'vitest'
import { codeBlockTerminalCommand } from './mobile-code-block-run'

describe('codeBlockTerminalCommand', () => {
  it('types one shell line without its newline, so it waits for Enter', () => {
    expect(codeBlockTerminalCommand('glab auth status\n', undefined)).toBe('glab auth status')
  })

  it('offers nothing for several lines, which would run before Enter', () => {
    expect(codeBlockTerminalCommand('cd repo\nmake', 'bash')).toBeNull()
    expect(codeBlockTerminalCommand('cd repo\rmake', 'bash')).toBeNull()
  })

  it('turns controls into spaces and skips other languages', () => {
    expect(codeBlockTerminalCommand('ls\x03 -la\t.', 'sh')).toBe('ls  -la .')
    expect(codeBlockTerminalCommand('print(1)', 'python')).toBeNull()
  })
})
