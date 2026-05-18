import React from 'react'

export default function Card({ children, className = '', padding = 'p-8' }) {
  return (
    <div className={`surface rounded-2xl ${padding} transition-smooth ${className} hover:scale-105 hover:border-green-400 hover:shadow-[0_8px_40px_rgba(34,197,94,0.04)]`}> 
      {children}
    </div>
  )
}
