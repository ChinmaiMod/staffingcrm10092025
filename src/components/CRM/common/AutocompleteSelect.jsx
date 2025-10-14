import { useState, useRef, useEffect } from 'react'

export default function AutocompleteSelect({ options, value, onChange, placeholder = 'Type to search...', disabled = false }) {
  const [inputValue, setInputValue] = useState(value || '')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(options)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    if (disabled) return
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Filter options based on input
    const filtered = options.filter(option =>
      option.toLowerCase().includes(newValue.toLowerCase())
    )
    setFilteredOptions(filtered)
    setIsOpen(true)
  }

  const handleSelectOption = (option) => {
    if (disabled) return
    setInputValue(option)
    onChange(option)
    setIsOpen(false)
  }

  const handleFocus = () => {
    if (disabled) return
    setFilteredOptions(options)
    setIsOpen(true)
  }

  const handleBlur = () => {
    // Only update if the input value matches an option or is empty
    if (!disabled && inputValue && !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase())) {
      onChange(inputValue) // Allow custom values
    }
  }

  return (
    <div className="multi-select" ref={dropdownRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
        }}
      />

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="multi-select-dropdown" style={{ position: 'absolute', width: '100%', zIndex: 10 }}>
          {filteredOptions.map(option => (
            <div
              key={option}
              className="multi-select-option"
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur
                handleSelectOption(option)
              }}
              style={{ cursor: 'pointer' }}
            >
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
