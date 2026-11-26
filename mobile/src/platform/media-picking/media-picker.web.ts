import { useMemo } from 'react'
import type { BridgeMediaItem } from '../../mobile-web-shell/bridge/native-capabilities/bridge-media-verbs'
import {
  readStagedMediaBytes,
  readStagedMediaItem,
  releaseAllStagedMedia,
  releaseStagedMedia
} from '../../mobile-web-shell/bridge/native-capabilities/staged-media-bytes'
import {
  NativeVerbError,
  useNativeVerbs,
  type NativeVerbs
} from '../../mobile-web-shell/bridge/native-capabilities/use-native-verbs'
import {
  CameraPermissionError,
  MOBILE_PICKED_FILE_MAX_BYTES,
  MobileFileTooLargeError,
  type MediaPicker,
  type MobileImageSource,
  type PickedMobileFile,
  type PickedMobileImage
} from './media-picker-contract'
import { isPickedImageMime, mobilePickedFileFallbackName } from './mobile-picked-file-name'
import { CLIPBOARD_IMAGE_MAX_SOURCE_BYTES } from '../../../../src/shared/clipboard/clipboard-image'

// Read staged handles in chunks because images exceed reply caps; release every handle, including unused extras, before the eight-item registry fills.
// Refusals reject; only user cancellation returns an empty selection.

// The page cannot load a native cache URI; the composer falls back to an inline data URI.
function pickedImage(
  base64: string,
  fileName: string | undefined,
  mime: string
): PickedMobileImage {
  return { base64, fileName, mime }
}

// Older shells lack nameMedia; derive a filename from MIME instead.
async function pickedFileName(
  verbs: NativeVerbs,
  item: BridgeMediaItem,
  index: number
): Promise<string> {
  return (
    (verbs.canNameMedia ? await verbs.nameMedia(item.handle) : null) ??
    mobilePickedFileFallbackName(item.mime, index)
  )
}

async function* readPicked(
  verbs: NativeVerbs,
  items: readonly BridgeMediaItem[],
  source: MobileImageSource
): AsyncGenerator<PickedMobileImage> {
  const unread = [...items]
  try {
    let index = 0
    while (unread.length > 0) {
      const item = unread[0]!
      index += 1
      const fileName =
        source === 'files' && !isPickedImageMime(item.mime)
          ? await pickedFileName(verbs, item, index)
          : undefined
      if (item.byteLength > CLIPBOARD_IMAGE_MAX_SOURCE_BYTES) {
        throw new MobileFileTooLargeError(fileName ?? null, CLIPBOARD_IMAGE_MAX_SOURCE_BYTES)
      }
      const base64 = await readStagedMediaItem(verbs, item)
      // Release before yielding because callers may stop after one image and strand scarce handles.
      unread.shift()
      await releaseStagedMedia(verbs, item.handle)
      yield pickedImage(base64, fileName, item.mime)
    }
  } finally {
    await releaseAllStagedMedia(verbs, unread)
  }
}

async function pickMediaItems(
  verbs: NativeVerbs,
  source: MobileImageSource,
  multiple: boolean
): Promise<readonly BridgeMediaItem[]> {
  try {
    return await verbs.pickMedia(source, multiple)
  } catch (error) {
    if (error instanceof NativeVerbError) {
      if (error.reason === 'native_media_permission_denied' && source === 'camera') {
        throw new CameraPermissionError()
      }
      if (error.reason === 'native_media_too_large') {
        throw new MobileFileTooLargeError(null)
      }
    }
    throw error
  }
}

async function pickFileItems(verbs: NativeVerbs): Promise<readonly BridgeMediaItem[]> {
  return pickMediaItems(verbs, 'files', true)
}

async function* readPickedFiles(
  verbs: NativeVerbs,
  items: readonly BridgeMediaItem[]
): AsyncGenerator<PickedMobileFile> {
  const unread = [...items]
  try {
    let index = 0
    while (unread.length > 0) {
      const item = unread.shift()!
      index += 1
      try {
        const name = await pickedFileName(verbs, item, index)
        if (item.byteLength > MOBILE_PICKED_FILE_MAX_BYTES) {
          throw new MobileFileTooLargeError(name)
        }
        // Held until the caller asks for the next file: its upload reads the handle while this generator waits.
        yield {
          name,
          mime: item.mime,
          byteLength: item.byteLength,
          readBytes: () => readStagedMediaBytes(verbs, item)
        }
      } finally {
        await releaseStagedMedia(verbs, item.handle)
      }
    }
  } finally {
    await releaseAllStagedMedia(verbs, unread)
  }
}

function addContextOpener(verbs: NativeVerbs): MediaPicker['openAddContext'] {
  if (!verbs.canPickMedia || !verbs.canOpenAddContext) {
    return null
  }
  return async (options) => {
    const { choice, items } = await verbs.openAddContext(options)
    if (choice !== 'recent') {
      await releaseAllStagedMedia(verbs, items)
      return { choice }
    }
    return {
      choice,
      images: {
        [Symbol.asyncIterator]: () => readPicked(verbs, items, 'library')
      },
      // Releasing a handle the reader already released is a normal false.
      release: () => void releaseAllStagedMedia(verbs, items)
    }
  }
}

export function useMediaPicker(): MediaPicker {
  const verbs = useNativeVerbs()

  return useMemo<MediaPicker>(
    () => ({
      pickImage: async (source) => {
        for await (const image of readPicked(
          verbs,
          await pickMediaItems(verbs, source, false),
          source
        )) {
          return image
        }
        return null
      },
      pickImages: (source) => ({
        [Symbol.asyncIterator]: async function* () {
          yield* readPicked(verbs, await pickMediaItems(verbs, source, true), source)
        }
      }),
      pickFiles: () => ({
        [Symbol.asyncIterator]: async function* () {
          yield* readPickedFiles(verbs, await pickFileItems(verbs))
        }
      }),
      recentPhotos: null,
      openAddContext: addContextOpener(verbs)
    }),
    [verbs]
  )
}
