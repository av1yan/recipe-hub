import React from 'react'

// Info Card with Left Badge, Center Content, Right Info
interface InfoCardProps {
  leftBadge?: { label: string; value: string | number }
  title: string
  subtitle?: string
  rightInfo?: string
  onClick?: () => void
  className?: string
}

export const InfoCard: React.FC<InfoCardProps> = ({
  leftBadge,
  title,
  subtitle,
  rightInfo,
  onClick,
  className = '',
}) => (
  <div
    onClick={onClick}
    className={`info-card ${className}`}
  >
    {leftBadge && (
      <div className="info-card-badge">
        <div className="badge-number">{leftBadge.value}</div>
        <div className="badge-label">{leftBadge.label}</div>
      </div>
    )}
    <div className="info-card-content">
      <div className="info-card-title">{title}</div>
      {subtitle && <div className="info-card-subtitle">{subtitle}</div>}
    </div>
    {rightInfo && (
      <div className="info-card-right">{rightInfo}</div>
    )}
  </div>
)

// Stats Grid - 3 columns
interface StatBoxProps {
  value: string | number
  label: string
}

interface StatsGridProps {
  stats: StatBoxProps[]
  className?: string
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, className = '' }) => (
  <div className={`stats-grid ${className}`}>
    {stats.map((stat, idx) => (
      <div key={idx} className="stat-box">
        <div className="stat-value">{stat.value}</div>
        <div className="stat-label">{stat.label}</div>
      </div>
    ))}
  </div>
)

// Info Tracker Box
interface TrackerBoxProps {
  title: string
  children: React.ReactNode
  className?: string
}

export const TrackerBox: React.FC<TrackerBoxProps> = ({ title, children, className = '' }) => (
  <div className={`tracker-box ${className}`}>
    <div className="tracker-title">{title}</div>
    <div className="tracker-content">{children}</div>
  </div>
)

// Filter Tabs
interface FilterTab {
  label: string
  value: string
}

interface FilterTabsProps {
  tabs: FilterTab[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  tabs,
  active,
  onChange,
  className = '',
}) => (
  <div className={`filter-tabs ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        className={`filter-tab ${active === tab.value ? 'active' : ''}`}
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

// Action Button with Icon
interface ActionButtonProps {
  icon?: string
  text: string
  onClick?: () => void
  className?: string
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  text,
  onClick,
  className = '',
}) => (
  <button className={`action-button ${className}`} onClick={onClick}>
    {icon && <span className="action-icon">{icon}</span>}
    <span className="action-text">{text}</span>
  </button>
)
