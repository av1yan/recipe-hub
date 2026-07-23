import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, List, Volume2, VolumeX, Crown, PartyPopper } from 'lucide-react'
import type { Screen, Recipe } from '../types'
import { getUnitPref, convertMeasurement, getTempPref, convertTempInText } from '../utils/preferences'
import { useProPlan } from '../utils/proPlan'

interface Props {
  recipe: Recipe | null
  onNavigate: (screen: Screen, data?: any) => void
}

export default function CookingModeScreen({ recipe, onNavigate }: Props) {
  const [isPro] = useProPlan()
  const [currentStep, setCurrentStep] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [speaking, setSpeaking] = useState(false)
  const [finished, setFinished] = useState(false)

  const instructions = (recipe as any)?.instructions || []
  const totalSteps = instructions.length
  const step = instructions[currentStep]
  const unitPref = getUnitPref()
  const tempPref = getTempPref()
  const stepText = convertTempInText(step?.text || '', tempPref)

  useEffect(() => {
    if (!timerActive || timerSeconds === null || timerSeconds <= 0) {
      if (timerSeconds === 0) {
        setTimerActive(false)
        // A buzz + a spoken heads-up the moment a step's timer finishes.
        try { navigator.vibrate?.([200, 100, 200]) } catch { /* unsupported */ }
        try {
          if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance("Time's up"))
        } catch { /* unsupported */ }
      }
      return
    }
    const id = setInterval(() => setTimerSeconds(s => (s !== null ? s - 1 : null)), 1000)
    return () => clearInterval(id)
  }, [timerActive, timerSeconds])

  useEffect(() => {
    setTimerActive(false)
    setTimerSeconds(step?.duration ? step.duration * 60 : null)
    // Stop any read-aloud when the step changes.
    try { speechSynthesis?.cancel() } catch { /* unsupported */ }
    setSpeaking(false)
  }, [currentStep])

  // Keep the screen awake while cooking (hands are busy) — Pro perk. Released
  // on unmount; re-acquired if the tab is re-shown.
  const wakeRef = useRef<any>(null)
  useEffect(() => {
    let cancelled = false
    const acquire = async () => {
      try {
        if (isPro && 'wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch { /* denied or unsupported */ }
    }
    acquire()
    const onVis = () => { if (document.visibilityState === 'visible' && !cancelled) acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      try { wakeRef.current?.release?.() } catch { /* noop */ }
      try { speechSynthesis?.cancel() } catch { /* noop */ }
    }
  }, [isPro])

  // Read the current step aloud (toggle).
  const toggleSpeak = () => {
    try {
      if (!('speechSynthesis' in window)) return
      if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return }
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(stepText)
      u.rate = 0.95
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      speechSynthesis.speak(u)
    } catch { setSpeaking(false) }
  }

  const goNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    if (currentStep < totalSteps - 1) setCurrentStep(c => c + 1)
  }

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!recipe) return null

  if (totalSteps === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-bg)' }}>
          <button onClick={() => onNavigate('recipe', { recipe })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
            <ChevronLeft size={22} color="var(--color-text-secondary)" />
          </button>
          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)' }}>{recipe.name}</span>
          <div style={{ width: 34 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '48px' }}>📋</div>
          <p style={{ fontSize: '16px', margin: 0 }}>No instructions for this recipe</p>
          <button
            onClick={() => onNavigate('recipe', { recipe })}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}
          >
            Back to Recipe
          </button>
        </div>
      </div>
    )
  }

  const isLastStep = currentStep === totalSteps - 1

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-bg)', flexShrink: 0 }}>
        <button onClick={() => onNavigate('recipe', { recipe })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={20} color="var(--color-text-secondary)" />
        </button>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '700', letterSpacing: '0.08em', margin: 0 }}>COOKING MODE</p>
          <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</p>
        </div>
        <button
          onClick={() => setShowIngredients(v => !v)}
          style={{ background: showIngredients ? 'var(--color-primary-bg)' : 'var(--color-subtle)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <List size={18} color={showIngredients ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-subtle)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: 'var(--color-primary)', width: `${((currentStep + 1) / totalSteps) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Ingredients overlay */}
      {showIngredients && (
        <div style={{ position: 'absolute', top: '67px', left: 0, right: 0, bottom: 0, background: 'var(--color-bg)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 16px' }}>Ingredients</h3>
            {(recipe as any).ingredients?.length > 0 ? (
              <div>
                {(recipe as any).ingredients.map((ing: any, i: number) => (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 0', borderTop: i > 0 ? '1px solid var(--color-subtle)' : 'none' }}>
                    <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600', flexShrink: 0 }}>{(() => { const c = convertMeasurement(ing.quantity || 0, ing.unit, unitPref); return `${c.quantity} ${c.unit}` })()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '32px' }}>No ingredients listed</p>
            )}
          </div>
          <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--color-subtle)' }}>
            <button
              onClick={() => setShowIngredients(false)}
              style={{ width: '100%', padding: '13px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Back to Steps
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 0', overflowY: 'auto' }}>

        {/* Step dots + counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: 1, marginRight: '12px' }}>
            {instructions.map((_: any, i: number) => (
              <div key={i} style={{
                height: '6px',
                borderRadius: '3px',
                width: i === currentStep ? '20px' : '6px',
                background: completedSteps.has(i) ? 'var(--color-primary)' : i === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '700', flexShrink: 0 }}>
            {currentStep + 1} / {totalSteps}
          </span>
        </div>

        {/* Step — the hero of the screen, on the page, no card */}
        <div style={{ padding: '2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '800', letterSpacing: '0.1em', margin: 0 }}>
              STEP {step?.stepNumber || currentStep + 1}
            </p>
            {isPro ? (
              <button
                onClick={toggleSpeak}
                aria-label={speaking ? 'Stop reading' : 'Read step aloud'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--color-primary-border)', background: speaking ? 'var(--color-primary)' : 'var(--color-primary-bg)', color: speaking ? '#fff' : 'var(--color-primary-dark)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {speaking ? <><VolumeX size={13} /> Stop</> : <><Volume2 size={13} /> Read</>}
              </button>
            ) : (
              <button
                onClick={() => onNavigate('settings')}
                aria-label="Read step aloud is a Pro feature"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Volume2 size={13} /> Read <Crown size={11} color="#f4b860" />
              </button>
            )}
          </div>
          <p style={{ fontSize: '22px', fontWeight: '500', color: 'var(--color-text)', lineHeight: 1.6, margin: 0, letterSpacing: '-0.01em' }}>
            {stepText}
          </p>
        </div>

        {/* Timer — interactive for Pro; a teaser for free */}
        {timerSeconds !== null && !isPro && (
          <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate('settings')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '999px', border: '1px solid var(--color-border)', background: 'var(--color-subtle)', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Clock size={15} color="var(--color-text-muted)" />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(timerSeconds)}</span>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>step timer</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Crown size={12} color="#f4b860" /> Pro
              </span>
            </button>
          </div>
        )}
        {timerSeconds !== null && isPro && (
          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '130px', height: '130px', borderRadius: '65px',
              border: `4px solid ${timerSeconds === 0 ? 'var(--color-primary)' : timerActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: timerSeconds === 0 ? 'var(--color-primary-bg)' : 'var(--color-card)',
              transition: 'all 0.3s',
              boxShadow: timerActive ? '0 0 0 6px rgba(107,163,86,0.12)' : 'none',
            }}>
              <Clock size={16} color={timerActive ? 'var(--color-primary)' : 'var(--color-text-muted)'} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '30px', fontWeight: '800', color: timerSeconds === 0 ? 'var(--color-primary)' : timerActive ? 'var(--color-text)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatTime(timerSeconds)}
              </span>
            </div>
            <button
              onClick={() => {
                if (timerSeconds === 0) {
                  setTimerSeconds(step?.duration ? step.duration * 60 : 0)
                  setTimerActive(false)
                } else {
                  setTimerActive(a => !a)
                }
              }}
              style={{
                background: timerSeconds === 0 ? 'var(--color-primary-bg)' : timerActive ? 'var(--color-error-bg)' : 'var(--color-primary-bg)',
                color: timerSeconds === 0 ? 'var(--color-primary)' : timerActive ? '#ef4444' : 'var(--color-primary)',
                border: 'none', borderRadius: '10px', padding: '9px 24px',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {timerSeconds === 0 ? '↺ Reset' : timerActive ? 'Pause' : 'Start Timer'}
            </button>
            {timerSeconds === 0 && (
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)' }}>⏰ Time's up!</span>
            )}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div style={{ padding: '12px 20px 20px', display: 'flex', gap: '10px', borderTop: '1px solid var(--color-subtle)', background: 'var(--color-bg)', flexShrink: 0 }}>
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: currentStep === 0 ? 'var(--color-bg)' : 'var(--color-primary-bg)',
            color: currentStep === 0 ? 'var(--color-disabled)' : 'var(--color-primary-dark)',
            border: 'none', cursor: currentStep === 0 ? 'default' : 'pointer',
            fontSize: '14px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }}
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        {isLastStep ? (
          <button
            onClick={() => {
              setCompletedSteps(prev => new Set([...prev, currentStep]))
              try { navigator.vibrate?.([120, 60, 120, 60, 200]) } catch { /* unsupported */ }
              setFinished(true)
            }}
            style={{
              flex: 2, padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(107,163,86,0.35)',
            }}
          >
            <CheckCircle size={17} />
            Finish Cooking!
          </button>
        ) : (
          <button
            onClick={goNext}
            style={{
              flex: 2, padding: '14px', borderRadius: '12px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            Next Step
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Finish celebration — the fun payoff for getting through every step. */}
      {finished && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px', gap: '16px' }}>
          <div style={{ width: '84px', height: '84px', borderRadius: '26px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={42} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>Nicely done! 🎉</h2>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '300px' }}>
            You cooked <strong style={{ color: 'var(--color-text)' }}>{recipe.name}</strong> — all {totalSteps} steps. Enjoy!
          </p>
          <button
            onClick={() => onNavigate('recipe', { recipe })}
            style={{ marginTop: '8px', padding: '13px 26px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark))', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(107,163,86,0.35)', fontFamily: 'inherit' }}
          >
            <CheckCircle size={17} /> Back to recipe
          </button>
        </div>
      )}
    </div>
  )
}
