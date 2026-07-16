import { ChevronRight, User, Settings, Crown, Globe, SlidersHorizontal, Smartphone, HelpCircle, Zap, BookOpen, Monitor, UserPlus, LogOut } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  onNavigate: (screen: Screen) => void
  onSignOut: () => void
}

interface RowProps {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  danger?: boolean
}

function Row({ icon, label, onPress, danger }: RowProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
        padding: '13px 16px', background: '#fff', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: danger ? '#fee2e2' : '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: '15px', color: danger ? '#ef4444' : '#1e293b', fontWeight: '500' }}>
        {label}
      </span>
      <ChevronRight size={17} color="#cbd5e1" />
    </button>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: '#f1f5f9', marginLeft: '66px' }} />
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', margin: '0 0 6px', padding: '0 16px' }}>
      {label}
    </p>
  )
}

export default function SettingsScreen({ onNavigate, onSignOut }: Props) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={22} color="#1e293b" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: 0, flex: 1 }}>Settings</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Main section */}
        <div style={{ marginTop: '20px', marginBottom: '24px' }}>
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<User size={18} color="#64748b" />} label="Edit profile" />
            <Divider />
            <Row icon={<Settings size={18} color="#64748b" />} label="Account settings" />
            <Divider />
            <Row icon={<Crown size={18} color="#f4b860" />} label="My subscription" />
            <Divider />
            <Row icon={<Globe size={18} color="#64748b" />} label="Language" />
            <Divider />
            <Row icon={<SlidersHorizontal size={18} color="#64748b" />} label="Preferences" />
            <Divider />
            <Row icon={<Smartphone size={18} color="#64748b" />} label="App icon" />
            <Divider />
            <Row icon={<HelpCircle size={18} color="#64748b" />} label="Help" />
          </div>
        </div>

        {/* Log out */}
        <div style={{ margin: '0 16px 28px' }}>
          <button
            onClick={onSignOut}
            style={{
              width: '100%', padding: '15px',
              background: 'linear-gradient(135deg, #7ec063, #5a9449)',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(107,163,86,0.25)',
            }}
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>

        {/* Get Set Up */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader label="GET SET UP" />
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<Zap size={18} color="#6ba356" />} label="Add the recipHub shortcut" />
            <Divider />
            <Row icon={<BookOpen size={18} color="#64748b" />} label="Read our import guides" />
            <Divider />
            <Row icon={<Monitor size={18} color="#64748b" />} label="Use recipHub on desktop" />
          </div>
        </div>

        {/* Connect */}
        <div style={{ marginBottom: '28px' }}>
          <SectionHeader label="CONNECT" />
          <div style={{ borderRadius: '14px', overflow: 'hidden', margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            <Row icon={<UserPlus size={18} color="#6ba356" />} label="Invite friends" />
            <Divider />
            <Row icon={<HelpCircle size={18} color="#64748b" />} label="Help" />
          </div>
        </div>

        {/* Version */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#cbd5e1', marginBottom: '24px' }}>
          Version 1.0.0
        </p>

      </div>
    </div>
  )
}
