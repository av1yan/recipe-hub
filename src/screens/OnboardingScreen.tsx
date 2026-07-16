import { useState } from 'react'
import { ChevronRight, Sparkles, Clock, UtensilsCrossed, BookOpen } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
}

export default function OnboardingScreen({ onNavigate }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: '🍳',
      title: 'Welcome to recipHub',
      description: 'Your personal recipe companion. Save, plan, and cook smarter.',
      bgColor: '#fff',
      accentColor: '#c67139',
    },
    {
      icon: '📚',
      title: 'Save Any Recipe',
      description: 'Collect recipes from anywhere—blogs, URLs, or just type them in. All in one place.',
      bgColor: '#f5f1ed',
      accentColor: '#d4a574',
    },
    {
      icon: '📅',
      title: 'Plan Your Week',
      description: 'Drag recipes into your meal planner. Stay organized and discover new meals.',
      bgColor: '#e8f5f0',
      accentColor: '#6ba356',
    },
    {
      icon: '🛒',
      title: 'Auto Grocery List',
      description: 'One tap generates your full shopping list from the meal plan.',
      bgColor: '#f0f9fc',
      accentColor: '#5b9acd',
    },
    {
      icon: '👨‍🍳',
      title: 'Cook Smarter',
      description: 'Full-screen step-by-step guides with timers. Hands-free cooking made easy.',
      bgColor: '#faf5f0',
      accentColor: '#c67139',
    },
  ]

  const step = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onNavigate('home')
    }
  }

  return (
    <div
      className="screen"
      style={{
        background: step.bgColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background 0.5s ease',
      }}
    >
      {/* Progress Dots */}
      <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {steps.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: idx === currentStep ? step.accentColor : '#e2e8f0',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '24px', display: 'block' }}>{step.icon}</div>

        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', margin: 0 }}>
          {step.title}
        </h1>

        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginTop: '12px', maxWidth: '280px' }}>
          {step.description}
        </p>
      </div>

      {/* Button */}
      <div style={{ padding: '24px 16px' }}>
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '16px',
            background: step.accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: `0 4px 12px ${step.accentColor}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 8px 20px ${step.accentColor}50`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = `0 4px 12px ${step.accentColor}40`
          }}
        >
          {currentStep === steps.length - 1 ? (
            <>
              <Sparkles size={18} />
              Get Started
            </>
          ) : (
            <>
              Next
              <ChevronRight size={18} />
            </>
          )}
        </button>

        {currentStep < steps.length - 1 && (
          <button
            onClick={() => onNavigate('home')}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '12px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1e293b'
              e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
