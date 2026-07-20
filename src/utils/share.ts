/**
 * Share text via the native share sheet when it exists (phones), otherwise copy
 * it to the clipboard. Returns what happened so the caller can toast honestly.
 * A share sheet the person dismisses counts as done, not an error.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.share) {
    try {
      await nav.share({ title, text })
      return 'shared'
    } catch (err) {
      // AbortError = the person closed the sheet on purpose; don't fall back.
      if ((err as { name?: string })?.name === 'AbortError') return 'shared'
      // Anything else (unsupported payload, permission) falls through to copy.
    }
  }
  try {
    await nav?.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
