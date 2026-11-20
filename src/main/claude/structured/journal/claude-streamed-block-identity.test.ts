import { describe, expect, it } from 'vitest'
import { createClaudeStreamedBlockRegistry } from './claude-streamed-block-identity'

function streamEvent(event: Record<string, unknown>, uuid: string): Record<string, unknown> {
  return { type: 'stream_event', session_id: 'session-1', uuid, event }
}

describe('createClaudeStreamedBlockRegistry', () => {
  it('joins a final frame to its own message after the next message started streaming', () => {
    const registry = createClaudeStreamedBlockRegistry()
    registry.observe(streamEvent({ type: 'message_start', message: { id: 'msg-a' } }, 'u1'), 1)
    registry.observe(
      streamEvent(
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: 'Hi' } },
        'u2'
      ),
      2
    )
    registry.observe(streamEvent({ type: 'message_start', message: { id: 'msg-b' } }, 'u3'), 3)

    expect(
      registry.reconcile({ sessionId: 'session-1', parentToolUseId: null, messageId: 'msg-a' })
        ?.identity.uuid
    ).toBe('block:msg-a:0')
  })
})
