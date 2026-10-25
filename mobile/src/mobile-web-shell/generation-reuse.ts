import type { MobileWebBundleReusableAssets } from '../transport/mobile-web-bundle-fetch'
import type { MobileWebBundleAssetRead } from '../transport/mobile-web-bundle-reply-schemas'
import { requireStorablePath } from './generation-asset-path'
import { joinUri } from './generation-cache-uri'
import type { ActiveGeneration } from './generation-store'
import type { GenerationFileSystem } from './generation-store-file-system'

/**
 * Copies, never reads: the active generation was hash-verified when it was written and is never
 * written again (only renamed into place and deleted), and the page opens it as is on every
 * launch, so a whole copy is the same bytes the page already trusts. Matched by content, so an
 * asset the next build renamed is still found.
 */
function cachedFileOf(
  actives: readonly ActiveGeneration[],
  asset: MobileWebBundleAssetRead
): string | null {
  for (const active of actives) {
    const cached = active.manifest.assets.find((entry) => entry.sha256 === asset.sha256)
    if (cached?.byteLength === asset.byteLength) {
      return joinUri(active.directory, requireStorablePath(cached.path))
    }
  }
  return null
}

/** What a download may leave to the stage: matched now, and still whole on disk when checked.
 *  The host's own generation first, then other hosts': hosts on one build download it once. */
export function reusableAssetsOf(
  fs: GenerationFileSystem,
  actives: readonly ActiveGeneration[]
): MobileWebBundleReusableAssets {
  return {
    has: (asset) => {
      try {
        return cachedFileOf(actives, asset) !== null
      } catch {
        return false
      }
    },
    check: async (asset) => {
      try {
        const source = cachedFileOf(actives, asset)
        return source !== null && (await fs.fileSize(source)) === asset.byteLength
      } catch {
        return false
      }
    }
  }
}

/**
 * Copies a reused asset out of the generation active now, which may not be the one the download
 * checked: a commit in between replaced it. Throws when that generation lacks the asset or the
 * copy is not whole, which fails the stage; the retry checks against the new generation.
 */
export async function copyCachedAsset(
  fs: GenerationFileSystem,
  actives: readonly ActiveGeneration[],
  asset: MobileWebBundleAssetRead,
  target: string
): Promise<void> {
  const source = cachedFileOf(actives, asset)
  if (source === null) {
    throw new Error(`the cached generation no longer holds the reused asset ${asset.path}`)
  }
  await fs.copyFile(source, target)
  if ((await fs.fileSize(target)) !== asset.byteLength) {
    throw new Error(`the reused asset ${asset.path} did not copy whole`)
  }
}
