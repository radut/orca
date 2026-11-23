import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

let privateFeedUrl: Promise<string | null> | null = null

async function readFeedUrl(): Promise<string | null> {
  try {
    const parsed: unknown = JSON.parse(
      await readFile(join(app.getAppPath(), 'package.json'), 'utf8')
    )
    const url =
      typeof parsed === 'object' && parsed !== null && 'updateFeedUrl' in parsed
        ? parsed.updateFeedUrl
        : null
    return typeof url === 'string' && url.startsWith('https://') ? url : null
  } catch {
    return null
  }
}

/** A build's own update feed (package.json "updateFeedUrl", set when packaging); null means GitHub releases. */
export function readPrivateUpdateFeedUrl(): Promise<string | null> {
  privateFeedUrl ??= readFeedUrl()
  return privateFeedUrl
}

type FeedTarget = { setFeedURL: (options: { provider: 'generic'; url: string }) => void }

/** Points the updater at the build's own feed; null when the build has none and GitHub releases apply. */
export async function pinPrivateUpdateFeed(
  updater: FeedTarget,
  isCurrentAttempt: () => boolean
): Promise<'ready' | 'not-available' | null> {
  const url = await readPrivateUpdateFeedUrl()
  if (!url) {
    return null
  }
  if (!isCurrentAttempt()) {
    return 'not-available'
  }
  updater.setFeedURL({ provider: 'generic', url })
  return 'ready'
}
