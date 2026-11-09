import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const writes: string[] = []
vi.mock('@/runtime/hosted-terminals/input/runtime-terminal-verified-input', () => ({
  sendRuntimePtyInputVerified: (_ptyId: string, data: string) => {
    writes.push(data)
    return Promise.resolve(true)
  }
}))
vi.mock('@/runtime/hosted-terminals/input/runtime-terminal-input-send', () => ({
  sendRuntimePtyInput: (_ptyId: string, data: string) => writes.push(data)
}))

import { sendNativeChatObservedWrites } from './native-chat-observed-send'

let nextPty = 0

function send(inputLine: () => string) {
  const onWriteRejected = vi.fn()
  const handle = sendNativeChatObservedWrites(
    `pty-${++nextPty}`,
    [
      { data: 'hello', delayBeforeMs: 0 },
      { data: '\r', delayBeforeMs: 500 }
    ],
    { clearInput: '', readInputLineAfterSubmit: inputLine, onWriteRejected }
  )
  return { handle, onWriteRejected }
}

describe('sendNativeChatObservedWrites submit confirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    writes.length = 0
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('presses Enter again when the message is still on the input line', async () => {
    let line = 'hello'
    const { handle, onWriteRejected } = send(() => line)
    await vi.advanceTimersByTimeAsync(1499)
    expect(writes).toEqual(['hello', '\r'])
    await vi.advanceTimersByTimeAsync(1)
    expect(writes).toEqual(['hello', '\r', '\r'])
    line = ''
    await vi.advanceTimersByTimeAsync(1000)
    expect(await handle.outcome).toBe('submitted')
    expect(onWriteRejected).not.toHaveBeenCalled()
  })

  it('reports the message unsent when Enter never takes', async () => {
    const { handle, onWriteRejected } = send(() => 'hello')
    await vi.advanceTimersByTimeAsync(3000)
    expect(writes).toEqual(['hello', '\r', '\r'])
    expect(await handle.outcome).toBe('not-submitted')
    expect(onWriteRejected).toHaveBeenCalledOnce()
  })
})
