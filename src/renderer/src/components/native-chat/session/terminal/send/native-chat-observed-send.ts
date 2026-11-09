import { sendRuntimePtyInputVerified } from '@/runtime/hosted-terminals/input/runtime-terminal-verified-input'
import { enqueueNativeChatPtySend } from './native-chat-pty-send-queue'
import {
  clearConfirmDurationMs,
  clearThenWrite,
  clearUnsubmittedAgentInput,
  type NativeChatSendOptions
} from './native-chat-input-clear'
import { NATIVE_CHAT_SUBMIT } from '../../../../../../../shared/native-chat/input/native-chat-paste-bytes'

/** How long the TUI gets to take an Enter before the input line is read again. */
export const NATIVE_CHAT_SUBMIT_CONFIRM_MS = 1000
/** Enters re-sent while the line still holds the message, before reporting it unsent. */
const SUBMIT_RETRIES = 1

export function sendNativeChatObservedWrites(
  ptyId: string,
  writes: readonly { data: string; delayBeforeMs: number }[],
  options: NativeChatSendOptions & { stopOnUnconfirmed?: boolean; settleDelayMs?: number }
) {
  // Dismiss answer cards only after provider acknowledgment.
  const writeOptions = options.onDeliverySettled
    ? ({ requireWriteSettlement: true } as const)
    : undefined
  return enqueueNativeChatPtySend(
    ptyId,
    writes.reduce((total, write) => total + write.delayBeforeMs, 0) +
      clearConfirmDurationMs(options) +
      (options.readInputLineAfterSubmit
        ? NATIVE_CHAT_SUBMIT_CONFIRM_MS * (SUBMIT_RETRIES + 1)
        : 0) +
      (options.settleDelayMs ?? 0),
    ({ isCancelled, delay, markSubmitted, markWriteStarted }) => {
      let reportedUnconfirmed = false
      let acknowledged = true
      const writeAt = (index: number): void => {
        if (isCancelled()) {
          return
        }
        const write = writes[index]
        if (!write) {
          const finish = (): void => {
            options.onDeliverySettled?.(acknowledged)
            markSubmitted(acknowledged ? 'submitted' : 'uncertain')
          }
          const settle = (): void => {
            if (options.settleDelayMs) {
              delay(options.settleDelayMs, finish)
            } else {
              finish()
            }
          }
          const readInputLine = options.readInputLineAfterSubmit
          if (readInputLine && acknowledged) {
            confirmSubmitted(readInputLine, SUBMIT_RETRIES, settle)
          } else {
            settle()
          }
          return
        }
        const send = (): void => {
          if (isCancelled()) {
            return
          }
          markWriteStarted()
          void sendRuntimePtyInputVerified(ptyId, write.data, 'driving', writeOptions)
            .then((accepted) => {
              if (isCancelled()) {
                return
              }
              if (!accepted) {
                options.onWriteRejected?.()
                options.onDeliverySettled?.(false)
                markSubmitted(index === 0 ? 'not-submitted' : 'uncertain')
                return
              }
              writeAt(index + 1)
            })
            // Lost acknowledgments must not replay bytes; submit the possibly delivered body as on the unobserved path.
            .catch(() => {
              if (isCancelled()) {
                return
              }
              acknowledged = false
              if (!reportedUnconfirmed) {
                reportedUnconfirmed = true
                options.onWriteUnconfirmed?.()
              }
              if (options.stopOnUnconfirmed) {
                options.onDeliverySettled?.(false)
                markSubmitted('uncertain')
                return
              }
              writeAt(index + 1)
            })
        }
        if (write.delayBeforeMs > 0) {
          delay(write.delayBeforeMs, send)
        } else {
          send()
        }
      }
      // A busy or slow TUI can drop the Enter, leaving the message typed but unsent.
      const confirmSubmitted = (
        readInputLine: () => string | null | undefined,
        retriesLeft: number,
        settle: () => void
      ): void => {
        delay(NATIVE_CHAT_SUBMIT_CONFIRM_MS, () => {
          let held = false
          try {
            held = !!readInputLine()
          } catch {
            // An unreadable line is no evidence the Enter was dropped.
          }
          if (!held) {
            settle()
            return
          }
          if (retriesLeft === 0) {
            console.warn('[native-chat-send] Enter not taken; message left on the input line', {
              ptyId
            })
            options.onWriteRejected?.()
            options.onDeliverySettled?.(false)
            markSubmitted('not-submitted')
            return
          }
          console.warn('[native-chat-send] Enter not taken; pressing it again', { ptyId })
          void sendRuntimePtyInputVerified(ptyId, NATIVE_CHAT_SUBMIT, 'driving', writeOptions).then(
            (accepted) => {
              if (!isCancelled()) {
                if (accepted) {
                  confirmSubmitted(readInputLine, retriesLeft - 1, settle)
                } else {
                  settle()
                }
              }
            },
            () => {
              if (!isCancelled()) {
                settle()
              }
            }
          )
        })
      }
      clearThenWrite(ptyId, options, delay, () => writeAt(0), markSubmitted)
    },
    { onCancelUnsubmitted: () => clearUnsubmittedAgentInput(ptyId, options) }
  )
}
