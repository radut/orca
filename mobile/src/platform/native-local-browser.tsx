import { useCallback, useState } from 'react'
import { Modal, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MobileLocalBrowserPane } from '../browser/MobileLocalBrowserPane'
import {
  canRenderBrowserLocally,
  useMobileBrowserLocalTunnel
} from '../browser/use-mobile-browser-local-tunnel'
import { translate } from '../i18n/mobile-i18n'
import {
  browserLocalParamsSchema,
  type BridgeBrowserLocalParams
} from '../mobile-web-shell/bridge/bridge-native-verbs'
import { BridgeNativeVerbRefusedError } from '../mobile-web-shell/bridge-host-errors'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { useHostClient } from '../transport/host-client-hooks'
import type { RpcClient } from '../transport/rpc-client'

/** Serves native.browser.local: the shell shows the tab full screen in its own web view, over the served page. */
export function useNativeLocalBrowser(hostId: string): {
  serve: (params: unknown) => Promise<unknown>
  overlay: React.JSX.Element | null
} {
  const { client } = useHostClient(hostId)
  const [request, setRequest] = useState<BridgeBrowserLocalParams | null>(null)
  const serve = useCallback(
    async (params: unknown) => {
      const parsed = browserLocalParamsSchema.parse(params)
      if (!canRenderBrowserLocally(client)) {
        throw new BridgeNativeVerbRefusedError(
          'native_browser_unsupported',
          'this phone cannot draw pages itself'
        )
      }
      setRequest(parsed)
      return {}
    },
    [client]
  )
  const overlay =
    request && client ? (
      <NativeLocalBrowserModal
        client={client}
        hostId={hostId}
        request={request}
        onClose={() => setRequest(null)}
      />
    ) : null
  return { serve, overlay }
}

function NativeLocalBrowserModal({
  client,
  hostId,
  request,
  onClose
}: {
  client: RpcClient
  hostId: string
  request: BridgeBrowserLocalParams
  onClose: () => void
}): React.JSX.Element {
  useMobileColorScheme()
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<string | null>(null)
  const local = useMobileBrowserLocalTunnel(client, hostId, request.worktreeId, true)
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {local.status === 'ready' ? (
          <MobileLocalBrowserPane
            proxyKey={local.proxyKey}
            storeId={local.storeId}
            initialUrl={request.url}
            onStreamFromHost={onClose}
            onToast={setToast}
          />
        ) : (
          <Text style={styles.status} onPress={onClose}>
            {local.status === 'failed'
              ? translate('browser.shellLocal.failed', 'Could not draw the page here: {{reason}}', {
                  reason: local.message
                })
              : translate('browser.shellLocal.starting', 'Connecting through the host…')}
          </Text>
        )}
        {toast !== null && (
          <Text style={styles.toast} onPress={() => setToast(null)}>
            {toast}
          </Text>
        )}
      </View>
    </Modal>
  )
}

const styles = themedStyleSheet(() => ({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase
  },
  status: {
    margin: 24,
    color: colors.textSecondary
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    padding: 12,
    color: colors.textPrimary,
    backgroundColor: colors.bgRaised
  }
}))
