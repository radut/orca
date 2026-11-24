import { describe, expect, it } from 'vitest'
import { codeBlockTerminalScript } from './code-block-terminal-script'

describe('codeBlockTerminalScript', () => {
  it('runs a shell block line by line, without its trailing newline', () => {
    expect(codeBlockTerminalScript('glab auth status\n', undefined)).toBe('glab auth status')
    expect(codeBlockTerminalScript('cd repo\r\nmake\rls', 'bash')).toBe('cd repo\nmake\nls')
  })

  it('offers nothing for hidden characters or other languages, and turns tabs into spaces', () => {
    expect(codeBlockTerminalScript('ls -la\t.', 'sh')).toBe('ls -la .')
    expect(codeBlockTerminalScript('ls\x03 -la', 'sh')).toBeNull()
    expect(codeBlockTerminalScript('rm\u202e -rf x', 'sh')).toBeNull()
    expect(codeBlockTerminalScript('print(1)', 'python')).toBeNull()
    expect(codeBlockTerminalScript(' \n', 'bash')).toBeNull()
  })
})
