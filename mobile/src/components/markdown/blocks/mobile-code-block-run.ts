import { createContext, useMemo } from 'react'
import {
  runCodeBlockScript,
  type CodeBlockScriptRunner
} from '../../../../../src/shared/code-block-terminal-run'
import type { RpcClient } from '../../../transport/rpc/rpc-client-contract'

/** Runs a code block's script in a background terminal of this workspace and reports its output; null elsewhere. */
export const MobileCodeBlockRunContext = createContext<CodeBlockScriptRunner | null>(null)

/** Code blocks run in `worktreeId` on the host `client` talks to. */
export function mobileCodeBlockRunner(
  client: RpcClient,
  worktreeId: string
): CodeBlockScriptRunner {
  return (script, onUpdate) =>
    runCodeBlockScript({
      worktreeId,
      script,
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
