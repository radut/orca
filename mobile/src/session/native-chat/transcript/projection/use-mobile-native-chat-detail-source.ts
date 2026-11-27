import { useCallback, useLayoutEffect, useMemo } from 'react'
import type { MobileNativeChatController } from '../../mobile-native-chat-controller-contract'
import type { useMobileNativeChatMessageDetail } from './use-mobile-native-chat-message-detail'

type MessageDetail = ReturnType<typeof useMobileNativeChatMessageDetail>['detail']

/** The chat's item source with its message-detail loader, which reads the newest detail of the same session. */
export function useMobileNativeChatDetailSource(
  itemSource: MobileNativeChatController['nativeChatItemSource'],
  detail: MessageDetail
) {
  const committedDetail = useMemo(
    () => ({ current: detail }),
    [itemSource?.client, itemSource?.sessionId]
  )
  useLayoutEffect(() => {
    committedDetail.current = detail
  }, [committedDetail, detail])
  const load = useCallback(
    async (id: string) => {
      if (!committedDetail.current) {
        throw new Error('Message unavailable')
      }
      await committedDetail.current.load(id)
    },
    [committedDetail]
  )
  return useMemo(
    () =>
      itemSource
        ? {
            ...itemSource,
            messageDetail: detail ? { ...detail, load } : null
          }
        : null,
    [itemSource, detail, load]
  )
}
