import { createContext } from 'react'

/** Puts a code block's command into a new terminal of this workspace (the session provides it); null elsewhere. */
export const MobileCodeBlockRunContext = createContext<((command: string) => void) | null>(null)

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'fish'])

/** Shell fences, and unlabeled ones, which agents often use for commands; pasting never runs them. */
export function isRunnableCodeBlock(language: string | undefined): boolean {
  return !language || SHELL_LANGUAGES.has(language.toLowerCase())
}

// Every C0/C1 control but tab and newline: a carriage return or Ctrl-C would act on the shell at once.
// oxlint-disable-next-line no-control-regex -- Why: these are exactly the characters removed.
const TERMINAL_CONTROLS = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g

/** The text typed into the new shell: one bracketed paste with no control characters and no trailing
 *  newline, so nothing in it runs before the user presses Enter. */
export function codeBlockTerminalText(code: string): string {
  const command = code.replace(/\r\n?/g, '\n').replace(TERMINAL_CONTROLS, '').replace(/\s+$/, '')
  return `\x1b[200~${command}\x1b[201~`
}
