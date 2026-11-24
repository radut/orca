import { createContext } from 'react'

/** Puts a code block's command into a new terminal of this workspace (the session provides it); null elsewhere. */
export const MobileCodeBlockRunContext = createContext<((command: string) => void) | null>(null)

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'fish'])

// Every C0/C1 control, newline and tab included: any of them could act on the shell before Enter.
// oxlint-disable-next-line no-control-regex -- Why: these are exactly the characters a paste must not carry.
const TERMINAL_CONTROLS = /[\x00-\x1f\x7f-\x9f]/g

/** The command a shell or unlabeled block types into a new terminal, or null when it has none. Only a
 *  single line: the paste lands before the shell turns bracketed paste on, so a newline would run. */
export function codeBlockTerminalCommand(
  code: string,
  language: string | undefined
): string | null {
  if (language && !SHELL_LANGUAGES.has(language.toLowerCase())) {
    return null
  }
  const command = code.trim()
  if (!command || /[\r\n]/.test(command)) {
    return null
  }
  return command.replace(TERMINAL_CONTROLS, ' ')
}
