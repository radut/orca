import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadLocalBrowserNetwork, type MobileLocalBrowserNetwork } from '../storage/preferences'
import type { RpcClient } from '../transport/rpc-client'
import { PHONE_NETWORK_BROWSER_STORE_ID } from './mobile-browser-local-proxy'
import { MobileLocalBrowserPane } from './MobileLocalBrowserPane'
import { useMobileBrowserLocalTunnel } from './use-mobile-browser-local-tunnel'

type Props = {
  client: RpcClient | null
  hostId: string
  worktreeId: string
  initialUrl: string
  // Shown until the saved network is read and, through the host, until the tunnel is up.
  pending: ReactNode
  onStreamFromHost: () => void
  // The tunnel through the host failed; the phone's network still works.
  onHostTunnelFailed: (reason: string) => void
  onToast: (message: string, durationMs?: number) => void
}

/** A phone-drawn tab on the network the browser settings pick; the toolbar can switch it for this tab. */
export function MobileLocalBrowser({
  client,
  hostId,
  worktreeId,
  initialUrl,
  pending,
  onStreamFromHost,
  onHostTunnelFailed,
  onToast
}: Props): React.JSX.Element {
  const [network, setNetwork] = useState<MobileLocalBrowserNetwork | null>(null)
  // Switching networks remounts the web view, which then reopens the page it was on.
  const currentUrl = useRef(initialUrl)
  const [resumeUrl, setResumeUrl] = useState(initialUrl)
  const local = useMobileBrowserLocalTunnel(client, hostId, worktreeId, network === 'host')

  useEffect(() => {
    let active = true
    void loadLocalBrowserNetwork().then((saved) => {
      if (active) {
        setNetwork((current) => current ?? saved)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const failure = network === 'host' && local.status === 'failed' ? local.message : null
  useEffect(() => {
    if (failure !== null) {
      onHostTunnelFailed(failure)
    }
  }, [failure, onHostTunnelFailed])

  if (network === null) {
    return <>{pending}</>
  }
  const ready =
    network === 'phone'
      ? { proxyKey: '', storeId: PHONE_NETWORK_BROWSER_STORE_ID }
      : local.status === 'ready'
        ? local
        : null
  if (!ready) {
    return <>{pending}</>
  }
  return (
    <MobileLocalBrowserPane
      key={network}
      network={network}
      proxyKey={ready.proxyKey}
      storeId={ready.storeId}
      initialUrl={resumeUrl}
      onStreamFromHost={onStreamFromHost}
      onNetworkChange={(next) => {
        setResumeUrl(currentUrl.current)
        setNetwork(next)
      }}
      onUrlChange={(url) => {
        currentUrl.current = url
      }}
      onToast={onToast}
    />
  )
}
