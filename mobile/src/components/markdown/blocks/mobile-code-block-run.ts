import { createContext } from 'react'

/** Runs a code block's script in a new terminal of this workspace (the session provides it); null elsewhere. */
export const MobileCodeBlockRunContext = createContext<((script: string) => void) | null>(null)
