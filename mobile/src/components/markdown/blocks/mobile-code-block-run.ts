import { createContext } from 'react'

/** Runs a code block's script in a new terminal of this workspace (the session provides it); null elsewhere. */
export const MobileCodeBlockRunContext = createContext<((script: string) => void) | null>(null)

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'fish'])

// Every C0/C1 control but newline: a stray Ctrl-C or escape would act on the shell instead of the script.
// oxlint-disable-next-line no-control-regex -- Why: these are exactly the characters a script must not carry.
const TERMINAL_CONTROLS = /[\x00-\x09\x0b-\x1f\x7f-\x9f]/g
// Bidi and zero-width marks: the block must run exactly what it shows.
const INVISIBLE_FORMATS = /\p{Cf}/gu

/** The script a shell or unlabeled block runs in a new terminal, one command per line, or null when it has none. */
export function codeBlockTerminalCommand(
  code: string,
  language: string | undefined
): string | null {
  if (language && !SHELL_LANGUAGES.has(language.toLowerCase())) {
    return null
  }
  const script = code.replace(/\r\n?/g, '\n').trim()
  return script ? script.replace(TERMINAL_CONTROLS, ' ').replace(INVISIBLE_FORMATS, '') : null
}
