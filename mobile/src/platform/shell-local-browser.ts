import type { BridgeBrowserLocalParams } from '../mobile-web-shell/bridge/bridge-native-verbs'

/** In the native app the browser pane draws locally itself, so there is no shell to ask. */
export function useShellLocalBrowser():
  | ((params: BridgeBrowserLocalParams) => Promise<void>)
  | null {
  return null
}
