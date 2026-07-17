import { useState, useRef } from 'react'
import { ChevronLeft, Link2, Type, Image as ImageIcon, Loader2 } from 'lucide-react'
import type { Screen } from '../types'
import { importAPI } from '../utils/api'

type Mode = 'web' | 'text' | 'photo' | 'social'

interface Props {
  mode: Mode
  onNavigate: (screen: Screen, data?: any) => void
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
    placeholder: 'Garlic Butter Pasta\n\nIngredients\n200g spaghetti\n3 cloves garlic\n\nMethod\n1. Boil the pasta…',
    cta: 'Read recipe',
  },
  photo: {
    title: 'Import from photo',
    blurb: 'Take a photo of a recipe — from a book or a card — and we’ll read the text off it.',
    placeholder: '',
    cta: 'Read photo',
  },
}

export default function ImportRecipeScreen({ mode, onNavigate }: Props) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const copy = COPY[mode]

  /** Hands the parsed draft to the normal form so it can be checked and fixed. */
  const review = (draft: any) => onNavigate('add-recipe', { draft })

  const submitLink = async () => {
    setError('')
    setBusy('Reading the page…')
    try {
      review(await importAPI.url(value.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that link')
    } finally {
      setBusy('')
    }
  }

  const submitText = async (text: string) => {
    setError('')
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
    <div className="screen" style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <button onClick={() => onNavigate('home')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={22} color="#1e293b" />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{copy.title}</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '22px', background: '#eaf3e6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          {icon}
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 }}>{copy.blurb}</p>

        {mode === 'photo' ? (
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
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={copy.placeholder}
              rows={11}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
            />
            <button onClick={() => submitText(value)} disabled={!!busy || value.trim().length < 12} style={{ ...primaryBtn(!!busy || value.trim().length < 12), marginTop: '12px' }}>
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

        {mode === 'social' && (
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
            Instagram and TikTok only hand out post captions to approved apps, so
            many links can’t be read automatically. If one fails, copy the caption
            and use <strong style={{ color: '#64748b' }}>Import from text</strong>.
          </p>
        )}

        <p style={{ marginTop: '18px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
          Nothing is saved until you’ve looked it over — the recipe opens in the
          normal form first.
        </p>
      </div>

      <style>{`.rh-spin { animation: rh-rot 1s linear infinite } @keyframes rh-rot { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
  fontSize: '15px', color: '#1e293b', background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
  background: disabled ? '#cbd5e1' : GREEN, color: '#fff', fontSize: '15px', fontWeight: '700',
  cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
})
