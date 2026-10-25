import { Copy, ExternalLink, Globe } from 'lucide-react-native'
import { ActionSheetModal, type ActionSheetAction } from '../components/ActionSheetModal'
import { openExternalLink } from '../platform/external-link'
import { useClipboardWriter } from '../platform/clipboard'

export type LinkSheetHandlers = {
  // Absent where an Orca browser tab cannot open (floating workspace, or a host without streaming).
  openInOrca?: (url: string) => void
  openExternal: (url: string) => void
  copy: (url: string) => void
}

export function linkSheetActions(url: string, handlers: LinkSheetHandlers): ActionSheetAction[] {
  const { openInOrca } = handlers
  return [
    ...(openInOrca
      ? [
          {
            label: 'Open in Orca browser',
            icon: Globe,
            closeBeforePress: true,
            onPress: () => openInOrca(url)
          }
        ]
      : []),
    {
      // The phone's default browser, which may not be Safari.
      label: 'Open in browser',
      icon: ExternalLink,
      closeBeforePress: true,
      onPress: () => handlers.openExternal(url)
    },
    { label: 'Copy link', icon: Copy, onPress: () => handlers.copy(url) }
  ]
}

// Choices for a tapped chat link: Orca's browser on the host, the phone's browser, or the clipboard.
export function MobileLinkActionSheet(props: {
  url: string | null
  onClose: () => void
  openInOrca?: (url: string) => void
  showToast: (message: string, durationMs?: number) => void
}): React.JSX.Element {
  const { url, onClose, openInOrca, showToast } = props
  const clipboard = useClipboardWriter()
  const copy = (value: string): void => {
    clipboard.writeText(value).then(
      () => showToast('Link copied', 1200),
      (error: unknown) =>
        showToast(error instanceof Error ? error.message : 'Could not copy the link', 1800)
    )
  }
  return (
    <ActionSheetModal
      visible={url !== null}
      title={url ?? 'Link'}
      actions={
        url === null
          ? []
          : linkSheetActions(url, { openInOrca, openExternal: openExternalLink, copy })
      }
      onClose={onClose}
    />
  )
}
