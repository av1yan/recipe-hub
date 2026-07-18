import { useState, useRef } from 'react'
import { ChevronLeft, Link2, Type, Image as ImageIcon, Loader2 } from 'lucide-react'
import type { Screen } from '../types'
import { importAPI } from '../utils/api'

type Mode = 'web' | 'text' | 'photo' | 'social'

interface Props {
  mode: Mode
  onNavigate: (screen: Screen, data?: any) => void
  /** The screen the add panel was opened over; Back returns there and reopens
      the panel rather than dropping you on Home. */
  backTo?: Screen
}

const GREEN = '#6ba356'

const COPY: Record<Mode, { title: string; blurb: string; placeholder: string; cta: string }> = {
  web: {
    title: 'Import from web',
    blurb: 'Paste a link to a recipe page and we’ll read it for you.',
    placeholder: 'https://…',
    cta: 'Import recipe',
  },
  social: {
    title: 'Import from social media',
    blurb: 'Paste a link to a post. If the caption has the recipe in it, we can read it.',
    placeholder: 'https://www.instagram.com/p/… or tiktok.com/…',
    cta: 'Import recipe',
  },
  text: {
    title: 'Import from text',
    blurb: 'Paste the recipe. Ingredients and steps are worked out for you.',
    placeholder: 'Paste the recipe here.\n\nFor example:\n\nGarlic Butter Pasta\nIngredients\n200g spaghetti\n3 cloves garlic\nMethod\n1. Boil the pasta…',
    cta: 'Read recipe',
  },
  photo: {
    title: 'Import from photo',
    blurb: 'Take a photo of a recipe — from a book or a card — and we’ll read the text off it.',
    placeholder: '',
    cta: 'Read photo',
  },
}

export default function ImportRecipeScreen({ mode, onNavigate, backTo = 'home' }: Props) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  // Social is two steps: fetch the caption, then let it be laid out. TikTok
  // returns the caption with its line breaks flattened, and only a person can
  // tell where they belonged.
  const [caption, setCaption] = useState<{ text: string; imageUrl: string | null; sourceUrl: string; author: string | null } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const copy = COPY[mode]

  /** Hands the parsed draft to the normal form so it can be checked and fixed. */
  const review = (draft: any) => onNavigate('add-recipe', { draft })

  const submitLink = async () => {
    setError('')
    setBusy(mode === 'social' ? 'Fetching the caption…' : 'Reading the page…')
    try {
      if (mode === 'social') {
        const got: any = await importAPI.social(value.trim())
        setCaption({ text: got.caption, imageUrl: got.imageUrl, sourceUrl: got.sourceUrl, author: got.author })
      } else {
        review(await importAPI.url(value.trim()))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that link')
    } finally {
      setBusy('')
    }
  }

  /** Parses the caption the person has laid out, keeping the post's photo. */
  const submitCaption = async () => {
    setError('')
    setBusy('Reading the recipe…')
    try {
      const draft: any = await importAPI.text(caption!.text)
      review({
        ...draft,
        imageUrl: draft.imageUrl ?? caption!.imageUrl,
        sourceUrl: caption!.sourceUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that')
    } finally {
      setBusy('')
    }
  }

  const submitText = async (text: string) => {
    setError('')
    // The button always presses. Say what is missing instead of sitting there
    // greyed out with no reason given.
    if (!text.trim()) {
      setError('Paste or type a recipe into the box first')
      return
    }
    if (text.trim().length < 12) {
      setError("That's too short to read as a recipe — paste the whole thing")
      return
    }
    setBusy('Reading the recipe…')
    try {
      review(await importAPI.text(text))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that')
    } finally {
      setBusy('')
    }
  }

  const submitPhoto = async (file: File) => {
    setError('')
    setBusy('Reading the photo…')
    try {
      // Loaded on demand — the OCR engine is far too heavy for the main bundle.
      const { default: Tesseract } = await import('tesseract.js')
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setBusy(`Reading the photo… ${Math.round(m.progress * 100)}%`)
        },
      })
      if (!data.text.trim()) throw new Error('No text found in that photo')
      await submitText(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo')
      setBusy('')
    }
  }

  const icon = mode === 'text' ? <Type size={20} color={GREEN} /> : mode === 'photo' ? <ImageIcon size={20} color={GREEN} /> : <Link2 size={20} color={GREEN} />

  return (
    <div className="screen" style={{ background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'var(--color-card)', borderBottom: '1px solid var(--color-subtle)', flexShrink: 0 }}>
        <button onClick={() => onNavigate(backTo, { openAddSheet: true })} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={22} color="var(--color-text)" />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>{copy.title}</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '22px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          {icon}
        </div>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 18px', lineHeight: 1.5 }}>{copy.blurb}</p>

        {mode === 'social' && caption ? (
          <>
            {caption.imageUrl && (
              <img
                src={caption.imageUrl}
                alt=""
                style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px', display: 'block' }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#92400e', lineHeight: 1.55 }}>
                TikTok hands the caption over with its line breaks removed, so the
                ingredients tend to run together. Put each one on its own line
                below and it can be read properly.
              </p>
            </div>
            <textarea
              value={caption.text}
              onChange={e => setCaption({ ...caption, text: e.target.value })}
              rows={11}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
            />
            <button onClick={submitCaption} disabled={!!busy} style={{ ...primaryBtn(!!busy), marginTop: '12px' }}>
              {busy || 'Read recipe'}
            </button>
            <button
              onClick={() => { setCaption(null); setValue('') }}
              style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Try another link
            </button>
          </>
        ) : mode === 'photo' ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => { const f = e.target.files?.[0]; if (f) submitPhoto(f) }}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={primaryBtn(!!busy)}>
              {busy ? <><Loader2 size={16} className="rh-spin" /> {busy}</> : 'Choose a photo'}
            </button>
          </>
        ) : mode === 'text' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>RECIPE</span>
              {value && (
                <button type="button" onClick={() => { setValue(''); setError('') }} style={miniBtn}>
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={copy.placeholder}
              rows={11}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
            />
            <button onClick={() => submitText(value)} disabled={!!busy} style={{ ...primaryBtn(!!busy), marginTop: '12px' }}>
              {busy || copy.cta}
            </button>
          </>
        ) : (
          <>
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={copy.placeholder}
              type="url"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputBase}
            />
            <button onClick={submitLink} disabled={!!busy || !value.trim()} style={{ ...primaryBtn(!!busy || !value.trim()), marginTop: '12px' }}>
              {busy || copy.cta}
            </button>
          </>
        )}

        {error && (
          <div style={{ marginTop: '14px', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {mode === 'social' && !caption && (
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            TikTok links work. Instagram and Facebook only hand captions to apps
            they have approved, so those can’t be read — copy the caption and use{' '}
            <strong style={{ color: 'var(--color-text-secondary)' }}>Import from text</strong> instead.
          </p>
        )}

        {!caption && (
          <p style={{ marginTop: '18px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Nothing is saved until you’ve looked it over — the recipe opens in the
            normal form first.
          </p>
        )}
      </div>

      <style>{`.rh-spin { animation: rh-rot 1s linear infinite } @keyframes rh-rot { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: '12px', border: '1.5px solid var(--color-border)',
  fontSize: '15px', color: 'var(--color-text)', background: 'var(--color-card)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const miniBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
  background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px',
  fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', cursor: 'pointer',
  fontFamily: 'inherit',
}

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  background: disabled ? 'var(--color-disabled)' : GREEN, color: '#fff', fontSize: '15px', fontWeight: '700',
  cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
})
