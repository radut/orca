import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('lucide-react-native', () => ({
  Copy: 'Copy',
  ExternalLink: 'ExternalLink',
  Globe: 'Globe'
}))
vi.mock('../components/ActionSheetModal', () => ({ ActionSheetModal: 'ActionSheetModal' }))
vi.mock('../platform/external-link', () => ({ openExternalLink: vi.fn() }))
vi.mock('../platform/clipboard', () => ({ useClipboardWriter: vi.fn() }))

const { linkSheetActions } = await import('./MobileLinkActionSheet')

const URL = 'https://x.com/a'

describe('link sheet actions', () => {
  it('offers the Orca browser, Safari and copy, each with the tapped link', () => {
    const handlers = { openInOrca: vi.fn(), openExternal: vi.fn(), copy: vi.fn() }
    const actions = linkSheetActions(URL, handlers)

    expect(actions.map((action) => action.label)).toEqual([
      'Open in Orca browser',
      'Open in Safari',
      'Copy link'
    ])
    for (const action of actions) {
      action.onPress()
    }
    expect(handlers.openInOrca).toHaveBeenCalledWith(URL)
    expect(handlers.openExternal).toHaveBeenCalledWith(URL)
    expect(handlers.copy).toHaveBeenCalledWith(URL)
  })

  it('leaves the Orca browser out where a tab cannot open', () => {
    const actions = linkSheetActions(URL, { openExternal: vi.fn(), copy: vi.fn() })

    expect(actions.map((action) => action.label)).toEqual(['Open in Safari', 'Copy link'])
  })
})
