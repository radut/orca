import { describe, expect, it } from 'vitest'
import { codeBlockTerminalText } from './mobile-code-block-run'

describe('codeBlockTerminalText', () => {
  it('pastes without the trailing newline, so it waits for Enter', () => {
    expect(codeBlockTerminalText('glab auth status\n')).toBe('\x1b[200~glab auth status\x1b[201~')
  })

  it('keeps lines but drops carriage returns and controls that would act on the shell', () => {
    expect(codeBlockTerminalText('cd repo\r\nmake\rls\x03\x1b[201~x\n')).toBe(
      '\x1b[200~cd repo\nmake\nls[201~x\x1b[201~'
    )
  })
})
