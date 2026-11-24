import { describe, expect, it } from 'vitest'
import { codeBlockTerminalText } from './mobile-code-block-run'

describe('codeBlockTerminalText', () => {
  it('types one line without the trailing newline, so it waits for Enter', () => {
    expect(codeBlockTerminalText('glab auth status\n')).toBe('glab auth status')
  })

  it('wraps several lines in one bracketed paste so none runs early', () => {
    expect(codeBlockTerminalText('cd repo\nmake\n')).toBe('\x1b[200~cd repo\nmake\x1b[201~')
  })
})
