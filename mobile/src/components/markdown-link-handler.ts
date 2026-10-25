import { createContext } from 'react'

/** Where a tapped web link goes on a screen that offers choices for it; absent, the system
 *  browser opens it as before. */
export const MarkdownLinkHandlerContext = createContext<((url: string) => void) | null>(null)
