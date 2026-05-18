import React from 'react'

export default function Button({ children, variant = 'primary', size = 'md', onClick, className = '', ...rest }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none '

  const variantClass = variant === 'primary'
    ? 'bg-green-600 text-white hover:bg-green-700'
    : variant === 'secondary'
      ? 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
      : 'bg-transparent text-gray-700'

  const sizeClass = size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2 text-sm'

  return (
    <button onClick={onClick} className={`${base} ${variantClass} ${sizeClass} ${className}`} {...rest}>
      {children}
    </button>
  )
}
