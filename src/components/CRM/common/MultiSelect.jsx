import { useState, useRef, useEffect } from 'react'

export default function MultiSelect({ options, selected = [], onChange, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  const removeValue = (value) => {
    onChange(selected.filter(item => item !== value))
  }

  return (
    <div className="multi-select" ref={dropdownRef}>
      <div className="multi-select-display" onClick={() => setIsOpen(!isOpen)}>
        {selected.length > 0 ? (
          <div className="selected-values">
            {selected.map(value => (
              <span key={value} className="selected-value-chip">
                {value}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeValue(value)
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>{placeholder}</span>
        )}
        <span>▼</span>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown">
          {options.map(option => (
            <div
              key={option}
              className="multi-select-option"
              onClick={() => toggleOption(option)}
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => {}}
              />
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
