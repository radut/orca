import type { ComponentProps } from 'react'
import { MobileBrowserPane } from './MobileBrowserPane'
import { MobileBrowserSurface } from './MobileBrowserSurface'
import { MobileBrowserClientHostState } from './pane-view/MobileBrowserClientHostState'

type Props = ComponentProps<typeof MobileBrowserPane> & {
  // Given, the phone may draw the page itself through this host instead of streaming it.
  hostId?: string
}

/** The streamed page, or which desktop draws it when the host can't stream it to this phone. */
export function MobileBrowserTabBody({ hostId, ...props }: Props) {
  const { clientHost, url } = props.tab
  if (clientHost) {
    return (
      <MobileBrowserClientHostState
        clientHost={clientHost}
        url={url}
        bottomInset={props.bottomInset}
      />
    )
  }
  return hostId ? (
    <MobileBrowserSurface {...props} hostId={hostId} />
  ) : (
    <MobileBrowserPane {...props} />
  )
}
