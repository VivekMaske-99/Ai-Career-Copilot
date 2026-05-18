import React from 'react'

export default function ProgressCircle({ value = 0, size = 92, strokeWidth = 8, showLabel = false, label = '' }) {
  const stroke = strokeWidth
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(Math.round(Number(value) || 0), 0), 100)
  const offset = circumference - (progress / 100) * circumference

  // Responsive typography based on size
  const numberFont = Math.max(12, Math.round(size * 0.26))
  const smallFont = Math.max(10, Math.round(size * 0.09))

  // glow size scales with circle
  const glowStd = Math.max(2, Math.round(size / 40))

  return (
    <div
      role="img"
      aria-label={`Progress ${progress} percent`}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="atsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          <filter id="glowSmall">
            <feGaussianBlur stdDeviation={String(glowStd)} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#eef2f7"
          strokeWidth={stroke}
          fill="none"
        />

        {/* Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#atsGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          filter="url(#glowSmall)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.7s cubic-bezier(.2,.9,.2,1), stroke 0.3s',
            transformOrigin: '50% 50%'
          }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center leading-none">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: numberFont, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{progress}</span>
            <span style={{ fontSize: smallFont, color: '#64748b', lineHeight: 1 }}>/100</span>
          </div>
          {showLabel ? (
            <div style={{ marginTop: 6, fontSize: Math.max(10, Math.round(size * 0.08)), color: '#64748b' }}>{label}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}