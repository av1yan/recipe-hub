// Photos are stored inline on the recipe (imageUrl) rather than in object
// storage, so they must be downscaled and compressed hard before upload.

/**
 * Rewrites an Unsplash photo URL to the box it will actually be drawn into.
 *
 * Stored URLs are wide (`?w=800`), so a 64px tile was downloading a whole
 * landscape and letting CSS shrink it. Unsplash serves through imgix, so we
 * can ask for the target aspect directly and get a sharper, far smaller image.
 *
 * Cropping is left at imgix's centre default on purpose: `crop=entropy` was
 * measured side by side and framed plated dishes worse, zooming out to include
 * the table around them.
 *
 * Any other source — uploaded data URLs, arbitrary hosts — is passed through
 * untouched, so callers can use this for every recipe image.
 */
export function recipeImageSrc(url: string, boxW: number, boxH: number): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.hostname !== 'images.unsplash.com') return url

  // Retina screens need the extra pixels; beyond 2x the bytes stop paying off.
  const dpr = Math.min(2, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)))
  parsed.searchParams.set('w', String(Math.round(boxW * dpr)))
  parsed.searchParams.set('h', String(Math.round(boxH * dpr)))
  parsed.searchParams.set('fit', 'crop')
  parsed.searchParams.set('q', '80')
  return parsed.toString()
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // `from-image` honours EXIF orientation so phone photos aren't sideways.
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      /* fall through to the <img> path */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a readable image")) }
    img.src = url
  })
}

/**
 * Downscales an image file and returns a JPEG data URL, stepping the quality
 * down until it fits `maxChars` so we never post a huge body.
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 900,
  maxChars = 400_000
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')

  const source = await loadImage(file)
  const srcW = (source as ImageBitmap).width
  const srcH = (source as ImageBitmap).height
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot process images')
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)
  if ('close' in source) (source as ImageBitmap).close()

  for (const quality of [0.75, 0.6, 0.45, 0.35, 0.25]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= maxChars) return url
  }
  throw new Error('That image is too large — try a smaller one')
}
