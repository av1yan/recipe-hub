// Photos are stored inline on the recipe (imageUrl) rather than in object
// storage, so they must be downscaled and compressed hard before upload.

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
