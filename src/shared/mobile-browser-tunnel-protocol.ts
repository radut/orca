import { z } from 'zod'

export const MOBILE_BROWSER_TUNNEL_METHOD = 'network.mobileBrowserTunnel' as const

// The workspace picks the network the page sees: this host, its WSL distro or its SSH target.
export const MobileBrowserTunnelParams = z.object({
  workspaceId: z.string().min(1).max(1024)
})

export type MobileBrowserTunnelEvent =
  | { type: 'ready'; tunnelGeneration: number }
  | { type: 'closed'; tunnelGeneration: number }
