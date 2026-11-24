import { createContext, createElement, useMemo, type ReactNode } from 'react'
import {
  runCodeBlockScript,
  type CodeBlockScriptRunner
} from '../../../../../src/shared/code-block-terminal-run'
import type { RpcClient } from '../../../transport/rpc/rpc-client-contract'

/** Runs a code block in a background terminal of this workspace and reports its output; null elsewhere. */
export const MobileCodeBlockRunContext = createContext<CodeBlockScriptRunner | null>(null)

/** Code blocks run in `worktreeId` on the host `client` talks to. */
export function mobileCodeBlockRunner(
  client: RpcClient,
  worktreeId: string
): CodeBlockScriptRunner {
  return (block, onUpdate) =>
    runCodeBlockScript({
      worktreeId,
      block,
      onUpdate,
      call: async <T>(method: string, params: unknown) => {
        const response = await client.sendRequest(method, params)
        if (!response.ok) {
          throw new Error(response.error.message)
        }
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the runner names each method's result shape.
        return response.result as T
      }
    })
}

export function useMobileCodeBlockRunner(
  client: RpcClient | null,
  worktreeId: string | null
): CodeBlockScriptRunner | null {
  return useMemo(
    () => (client && worktreeId ? mobileCodeBlockRunner(client, worktreeId) : null),
    [client, worktreeId]
  )
}

/** Gives the code blocks under it a Play that runs them in `worktreeId`. */
export function MobileCodeBlockRunScope(props: {
  client: RpcClient | null
  worktreeId: string | null
  children: ReactNode
}) {
  const run = useMobileCodeBlockRunner(props.client, props.worktreeId)
  return createElement(MobileCodeBlockRunContext.Provider, { value: run }, props.children)
}
