import { createContext } from 'react'

/** Puts a code block's command into a new terminal of this workspace (the session provides it); null elsewhere. */
export const MobileCodeBlockRunContext = createContext<((command: string) => void) | null>(null)

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'fish'])

/** Shell fences, and unlabeled ones, which agents often use for commands; pasting never runs them. */
export function isRunnableCodeBlock(language: string | undefined): boolean {
  return !language || SHELL_LANGUAGES.has(language.toLowerCase())
}

/** The text typed into the new shell: no trailing newline, and several lines as one bracketed paste
 *  so none of them runs before the user presses Enter. */
export function codeBlockTerminalText(code: string): string {
  const command = code.replace(/\s+$/, '')
  return command.includes('\n') ? `\x1b[200~${command.split('\x1b').join('')}\x1b[201~` : command
}
