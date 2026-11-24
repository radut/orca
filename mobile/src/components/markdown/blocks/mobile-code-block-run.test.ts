import { describe, expect, it } from 'vitest'
import { codeBlockTerminalCommand } from './mobile-code-block-run'

describe('codeBlockTerminalCommand', () => {
  it('runs a shell block line by line, without its trailing newline', () => {
    expect(codeBlockTerminalCommand('glab auth status\n', undefined)).toBe('glab auth status')
    expect(codeBlockTerminalCommand('cd repo\r\nmake\rls', 'bash')).toBe('cd repo\nmake\nls')
  })

  it('turns controls into spaces and skips other languages', () => {
    expect(codeBlockTerminalCommand('ls\x03 -la\t.', 'sh')).toBe('ls  -la .')
    expect(codeBlockTerminalCommand('print(1)', 'python')).toBeNull()
    expect(codeBlockTerminalCommand(' \n', 'bash')).toBeNull()
  })
})
