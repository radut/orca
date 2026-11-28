import { X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'

export function EditorFileTabCloseButton({
  fileIsDirty,
  showsSelectionChrome,
  onClose
}: {
  fileIsDirty: boolean
  showsSelectionChrome: boolean
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <button
      className={`flex items-center justify-center w-4 h-4 rounded-sm ${
        fileIsDirty
          ? 'hidden group-hover:flex text-muted-foreground hover:text-foreground hover:bg-muted'
          : showsSelectionChrome
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
            : 'text-transparent group-hover:text-muted-foreground hover:!text-foreground hover:!bg-muted'
      }`}
      type="button"
      // Share the real close affordance with simulator tabs so E2E exercises their actual button.
      data-tab-close-button="true"
      aria-label={t('auto.components.tab.bar.EditorFileTabCloseButton.4655cf570e', 'Close tab')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <X className="w-3 h-3" />
    </button>
  )
}

/** One dot/close slot, so autosave cannot change the tab's width. */
export function EditorFileTabTrailingSlot({
  fileIsDirty,
  isPinned,
  showsSelectionChrome,
  onClose
}: {
  fileIsDirty: boolean
  isPinned: boolean
  showsSelectionChrome: boolean
  onClose: () => void
}): React.JSX.Element {
  return (
    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
      {fileIsDirty && (
        <span className="absolute size-1.5 rounded-full bg-foreground/60 group-hover:hidden group-focus-within:hidden" />
      )}
      {!isPinned && (
        <EditorFileTabCloseButton
          fileIsDirty={fileIsDirty}
          showsSelectionChrome={showsSelectionChrome}
          onClose={onClose}
        />
      )}
    </div>
  )
}
