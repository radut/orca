import * as z from 'zod'
import {
  compareAppVersions,
  isPrereleaseAppVersion,
  isValidAppVersion
} from '../../../src/shared/app-lifecycle/identity/app-version'
import type { AppUpdateCheckResult, AppUpdateSource } from './app-update-source'

type Fetch = typeof fetch

const feedSchema = z.looseObject({
  version: z.string(),
  build: z.string().regex(/^\d+$/),
  url: z.string().min(1)
})

/** The checker's version identity for feed builds: `<version>+<build number>`. */
export function feedBuildIdentity(version: string, build: string | null | undefined): string {
  return build && /^\d+$/.test(build) ? `${version}+${build}` : version
}

function splitIdentity(identity: string): { version: string; build: string } {
  const plus = identity.indexOf('+')
  const build = plus === -1 ? '' : identity.slice(plus + 1)
  return {
    version: plus === -1 ? identity : identity.slice(0, plus),
    build: /^\d+$/.test(build) ? build.replace(/^0+/, '') : ''
  }
}

// Build numbers are digit strings that can exceed Number.MAX_SAFE_INTEGER, so compare them as text.
function compareBuildNumbers(left: string, right: string): number {
  if (left.length !== right.length) {
    return left.length - right.length
  }
  return left < right ? -1 : left > right ? 1 : 0
}

/** Newer means a higher version, or the same version with a higher build number. */
export function isNewerFeedBuild(candidate: string, installed: string): boolean {
  const next = splitIdentity(candidate)
  const current = splitIdentity(installed)
  if (
    !isValidAppVersion(next.version) ||
    !isValidAppVersion(current.version) ||
    isPrereleaseAppVersion(next.version)
  ) {
    return false
  }
  const byVersion = compareAppVersions(next.version, current.version)
  return byVersion > 0 || (byVersion === 0 && compareBuildNumbers(next.build, current.build) > 0)
}

export function parseUpdateFeed(reply: unknown): { version: string; url: string } | null {
  const feed = feedSchema.safeParse(reply)
  return feed.success
    ? { version: feedBuildIdentity(feed.data.version, feed.data.build), url: feed.data.url }
    : null
}

/** A JSON feed (`{version, build, url}`) published with every build of a privately delivered app. */
export function createUpdateFeedSource(feedUrl: string, fetchImpl: Fetch): AppUpdateSource {
  return {
    isNewer: isNewerFeedBuild,
    async check(installedVersion, signal): Promise<AppUpdateCheckResult> {
      const reply = await fetchImpl(feedUrl, { signal, headers: { 'Cache-Control': 'no-cache' } })
      if (!reply.ok) {
        throw new Error(`update feed HTTP ${reply.status}`)
      }
      const feed = parseUpdateFeed(await reply.json())
      if (!feed) {
        throw new Error('update feed is malformed')
      }
      return isNewerFeedBuild(feed.version, installedVersion)
        ? { kind: 'available', version: feed.version, url: feed.url }
        : { kind: 'current' }
    }
  }
}

/** The feed URL from the build's Expo `extra.appUpdateFeedUrl`; only https is accepted. */
export function readUpdateFeedUrl(extra: Record<string, unknown> | undefined): string | null {
  const value = extra?.appUpdateFeedUrl
  return typeof value === 'string' && value.startsWith('https://') ? value : null
}
