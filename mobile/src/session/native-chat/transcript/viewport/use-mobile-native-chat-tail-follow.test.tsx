import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { expect, it, vi } from 'vitest'
import {
  useMobileNativeChatTailFollow,
  type MobileNativeChatTailFollow
} from './use-mobile-native-chat-tail-follow'

const platform = vi.hoisted(() => ({ OS: 'web' }))
vi.mock('react-native', () => ({ Platform: platform }))

it('returns to a chat where the reader left it, and to the tail of one left at the tail', () => {
  platform.OS = 'web'
  let tail: MobileNativeChatTailFollow | null = null
  function Probe({ scopeKey }: { scopeKey: string }) {
    tail = useMobileNativeChatTailFollow({ hasItems: true, scopeKey })
    return null
  }
  const list = {
    scrollToEnd: vi.fn(),
    scrollToOffset: vi.fn(),
    scrollToIndex: vi.fn(),
    readPlace: vi.fn(() => ({ key: 'reply-5', offset: 40 })),
    restorePlace: vi.fn(() => 'restored' as const)
  }
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(createElement(Probe, { scopeKey: 'chat-a' }))
  })
  act(() => tail?.pageListProps.ref(list))
  act(() => tail?.pageListProps.onEndDistance(600, true))

  act(() => renderer.update(createElement(Probe, { scopeKey: 'chat-b' })))
  expect(list.restorePlace).not.toHaveBeenCalled()
  list.scrollToEnd.mockClear()

  act(() => renderer.update(createElement(Probe, { scopeKey: 'chat-a' })))
  expect(list.restorePlace).toHaveBeenCalledWith({ key: 'reply-5', offset: 40 })
  expect(list.scrollToEnd).not.toHaveBeenCalled()
  expect(tail?.showJumpToTail).toBe(true)

  act(() => renderer.update(createElement(Probe, { scopeKey: 'chat-b' })))
  expect(list.scrollToEnd).toHaveBeenCalled()
  act(() => renderer.unmount())
})

it('keeps a reply scrolled to its start when new output grows the chat', () => {
  platform.OS = 'ios'
  let tail: MobileNativeChatTailFollow | null = null
  function Probe() {
    tail = useMobileNativeChatTailFollow({ hasItems: true, scopeKey: 'chat' })
    return null
  }
  const list = {
    scrollToEnd: vi.fn(),
    scrollToOffset: vi.fn(),
    scrollToIndex: vi.fn(),
    readPlace: vi.fn(() => undefined),
    restorePlace: vi.fn(() => 'missing' as const)
  }
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(createElement(Probe))
  })
  act(() => tail?.listProps.ref(list))

  act(() => tail?.scrollRowToTop(3))
  act(() => tail?.pinToTailAfterContentResize(0, 900))

  expect(list.scrollToIndex).toHaveBeenCalledWith({ animated: true, index: 3, viewPosition: 0 })
  expect(list.scrollToOffset).not.toHaveBeenCalled()
  act(() => renderer.unmount())
})
