import type { BridgeBrowserLocalParams } from '../mobile-web-shell/bridge/bridge-native-verbs'
import { useNativeVerbs } from '../mobile-web-shell/bridge/use-native-verbs'

/** A served page asks the app shell to draw the tab in its own web view; null when the installed app cannot. */
export function useShellLocalBrowser():
  | ((params: BridgeBrowserLocalParams) => Promise<void>)
  | null {
  const verbs = useNativeVerbs()
  return verbs.canOpenLocalBrowser ? verbs.openLocalBrowser : null
}
