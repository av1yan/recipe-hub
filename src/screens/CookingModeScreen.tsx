import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, List } from 'lucide-react'
import type { Screen, Recipe } from '../types'

interface Props {
  recipe: Recipe | null
  onNavigate: (screen: Screen, data?: any) => void
}

export default function CookingModeScreen({ recipe, onNavigate }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const instructions = (recipe as any)?.instructions || []
  const totalSteps = instructions.length
  const step = instructions[currentStep]

  useEffect(() => {
    if (!timerActive || timerSeconds === null || timerSeconds <= 0) {
      if (timerSeconds === 0) setTimerActive(false)
      return
    }
    const id = setInterval(() => setTimerSeconds(s => (s !== null ? s - 1 : null)), 1000)
    return () => clearInterval(id)
  }, [timerActive, timerSeconds])

  useEffect(() => {
    setTimerActive(false)
    setTimerSeconds(step?.duration ? step.duration * 60 : null)
  }, [currentStep])

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
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-card)' }}>
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
            style={{ background: '#6ba356', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}
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
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-subtle)', background: 'var(--color-card)', flexShrink: 0 }}>
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
          <List size={18} color={showIngredients ? '#6ba356' : 'var(--color-text-secondary)'} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-subtle)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: '#6ba356', width: `${((currentStep + 1) / totalSteps) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Ingredients overlay */}
      {showIngredients && (
        <div style={{ position: 'absolute', top: '67px', left: 0, right: 0, bottom: 0, background: 'var(--color-bg)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 16px' }}>Ingredients</h3>
            {(recipe as any).ingredients?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(recipe as any).ingredients.map((ing: any) => (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '600', flexShrink: 0 }}>{ing.quantity} {ing.unit}</span>
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
              style={{ width: '100%', padding: '13px', background: '#6ba356', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
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
                background: completedSteps.has(i) ? '#6ba356' : i === currentStep ? '#6ba356' : 'var(--color-border)',
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '700', flexShrink: 0 }}>
            {currentStep + 1} / {totalSteps}
          </span>
        </div>

        {/* Step card */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-subtle)', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '18px' }}>
          <p style={{ fontSize: '11px', color: '#6ba356', fontWeight: '800', letterSpacing: '0.1em', margin: '0 0 10px' }}>
            STEP {step?.stepNumber || currentStep + 1}
          </p>
          <p style={{ fontSize: '19px', fontWeight: '500', color: 'var(--color-text)', lineHeight: 1.65, margin: 0 }}>
            {step?.text}
          </p>
        </div>

        {/* Timer */}
        {timerSeconds !== null && (
          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '130px', height: '130px', borderRadius: '65px',
              border: `4px solid ${timerSeconds === 0 ? '#6ba356' : timerActive ? '#6ba356' : 'var(--color-border)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: timerSeconds === 0 ? 'var(--color-primary-bg)' : 'var(--color-card)',
              transition: 'all 0.3s',
              boxShadow: timerActive ? '0 0 0 6px rgba(107,163,86,0.12)' : 'none',
            }}>
              <Clock size={16} color={timerActive ? '#6ba356' : 'var(--color-text-muted)'} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '30px', fontWeight: '800', color: timerSeconds === 0 ? '#6ba356' : timerActive ? 'var(--color-text)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
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
                color: timerSeconds === 0 ? '#6ba356' : timerActive ? '#ef4444' : '#6ba356',
                border: 'none', borderRadius: '10px', padding: '9px 24px',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {timerSeconds === 0 ? '↺ Reset' : timerActive ? 'Pause' : 'Start Timer'}
            </button>
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div style={{ padding: '12px 16px 20px', display: 'flex', gap: '10px', borderTop: '1px solid var(--color-subtle)', background: 'var(--color-card)', flexShrink: 0 }}>
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: currentStep === 0 ? 'var(--color-bg)' : 'var(--color-primary-bg)',
            color: currentStep === 0 ? '#cbd5e1' : '#6ba356',
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
              onNavigate('home')
            }}
            style={{
              flex: 2, padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7ec063, #5a9449)',
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
              background: '#6ba356', color: '#fff',
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
    </div>
  )
}
