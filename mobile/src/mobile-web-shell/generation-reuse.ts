import type { MobileWebBundleReusableAssets } from '../transport/mobile-web-bundle-fetch'
import type { MobileWebBundleAssetRead } from '../transport/mobile-web-bundle-reply-schemas'
import { requireStorablePath } from './generation-asset-path'
import { joinUri } from './generation-cache-uri'
import type { ActiveGeneration } from './generation-store'
import type { GenerationFileSystem } from './generation-store-file-system'

type ReusableGenerationAssets = MobileWebBundleReusableAssets & {
  copyTo(asset: MobileWebBundleAssetRead, target: string): Promise<void>
}

// Copy immutable, previously hash-verified assets without reading them into JS; match content so renamed assets remain reusable.
export function reusableAssetsOf(
  fs: GenerationFileSystem,
  actives: readonly ActiveGeneration[]
): ReusableGenerationAssets {
  const byHash = new Map<string, { active: ActiveGeneration; entry: MobileWebBundleAssetRead }[]>()
  for (const active of actives) {
    const seen = new Set<string>()
    for (const entry of active.manifest.assets) {
      const { sha256 } = entry
      if (seen.has(sha256)) {
        continue
      }
      seen.add(sha256)
      const copies = byHash.get(sha256)
      if (copies) {
        copies.push({ active, entry })
      } else {
        byHash.set(sha256, [{ active, entry }])
      }
    }
  }
  const cachedFilesOf = (asset: MobileWebBundleAssetRead): string[] =>
    (byHash.get(asset.sha256) ?? [])
      .filter(({ entry }) => entry.byteLength === asset.byteLength)
      .map(({ active, entry }) => joinUri(active.directory, requireStorablePath(entry.path)))
  return {
    has: (asset) => {
      try {
        return cachedFilesOf(asset).length > 0
      } catch {
        return false
      }
    },
    check: async (asset) => {
      try {
        for (const source of cachedFilesOf(asset)) {
          if ((await fs.fileSize(source).catch(() => null)) === asset.byteLength) {
            return true
          }
        }
        return false
      } catch {
        return false
      }
    },
    // Stage from the current activation: an intervening commit may have replaced the download's source.
    // An unreadable copy in one host's cache falls through to the next; the last failure fails the stage.
    copyTo: async (asset, target) => {
      const sources = cachedFilesOf(asset)
      if (sources.length === 0) {
        throw new Error(`the cached generation no longer holds the reused asset ${asset.path}`)
      }
      let failure: unknown
      for (const source of sources) {
        try {
          await fs.delete(target)
          await fs.copyFile(source, target)
          if ((await fs.fileSize(target)) === asset.byteLength) {
            return
          }
          failure = new Error(`the reused asset ${asset.path} did not copy whole`)
        } catch (error) {
          failure = error
        }
      }
      throw failure
    }
  }
}
