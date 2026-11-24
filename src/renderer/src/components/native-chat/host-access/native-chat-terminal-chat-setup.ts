import { useMemo } from 'react'
import type { NativeChatImageRuntimeContext } from '../media/images/native-chat-image-runtime-context'
import type { NativeChatHostSetup } from './native-chat-host-setup'

/** A terminal-backed chat's host and workspace, so its code blocks can offer Play there; the
 *  agent's own terminal handles sign-in and install, so the chat offers neither. */
export function useNativeChatTerminalChatSetup(
  runtimeContext: NativeChatImageRuntimeContext
): NativeChatHostSetup | null {
  const target = runtimeContext?.target
  const worktreeId = runtimeContext?.worktreeId
  return useMemo(
    () => (target && worktreeId ? { signIn: null, install: null, host: target, worktreeId } : null),
    [target, worktreeId]
  )
}
