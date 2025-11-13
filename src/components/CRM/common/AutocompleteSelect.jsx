import { useState, useRef, useEffect, useMemo } from 'react'

const defaultGetOptionLabel = (option) => {
  if (option == null) return ''
  if (typeof option === 'string' || typeof option === 'number') {
    return String(option)
  }
  if (typeof option === 'object') {
    if (typeof option.label !== 'undefined') return option.label ?? ''
    if (typeof option.name !== 'undefined') return option.name ?? ''
    if (typeof option.value !== 'undefined') return option.value ?? ''
  }
  return ''
}

const defaultGetOptionValue = (option) => {
  if (option == null) return ''
  if (typeof option === 'string' || typeof option === 'number') {
    return option
  }
  if (typeof option === 'object') {
    if (typeof option.value !== 'undefined') return option.value ?? ''
    if (typeof option.id !== 'undefined') return option.id ?? ''
    if (typeof option.code !== 'undefined') return option.code ?? ''
    if (typeof option.country_id !== 'undefined') return option.country_id ?? ''
    if (typeof option.state_id !== 'undefined') return option.state_id ?? ''
    if (typeof option.city_id !== 'undefined') return option.city_id ?? ''
  }
  return ''
}

const toDisplayString = (value) => (value == null ? '' : String(value))

export default function AutocompleteSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Type to search...',
  disabled = false,
  getOptionLabel,
  getOptionValue,
  allowCustomValue = true
}) {
  const labelGetter = useMemo(() => (
    typeof getOptionLabel === 'function' ? getOptionLabel : defaultGetOptionLabel
  ), [getOptionLabel])

  const valueGetter = useMemo(() => (
    typeof getOptionValue === 'function' ? getOptionValue : defaultGetOptionValue
  ), [getOptionValue])

  const normalizeValue = (val) => {
    if (val == null) return ''
    if (typeof val === 'object') {
      return valueGetter(val)
    }
    return val
  }

  const [inputValue, setInputValue] = useState(() => {
    const normalized = normalizeValue(value)
    const normalizedString = toDisplayString(normalized)
    const selectedOption = Array.isArray(options)
      ? options.find(option => {
          if (option === value) return true
          const optionValue = valueGetter(option)
          const optionLabel = toDisplayString(labelGetter(option))
          return String(optionValue) === normalizedString || optionLabel === normalizedString
        })
      : null
    if (selectedOption) {
      return toDisplayString(labelGetter(selectedOption))
    }
    return normalizedString
  })
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(Array.isArray(options) ? options : [])
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!Array.isArray(options)) {
      setFilteredOptions([])
      return
    }
    setFilteredOptions(options)
  }, [options])

  useEffect(() => {
    if (!Array.isArray(options)) {
      setInputValue('')
      return
    }

    const normalized = normalizeValue(value)
    const normalizedString = toDisplayString(normalized)
    const selectedOption = options.find(option => {
      if (option === value) return true
      const optionValue = valueGetter(option)
      const optionLabel = toDisplayString(labelGetter(option))
      return String(optionValue) === normalizedString || optionLabel === normalizedString
    })

    if (selectedOption) {
      setInputValue(toDisplayString(labelGetter(selectedOption)))
    } else if (!normalizedString) {
      setInputValue('')
    } else if (allowCustomValue) {
      setInputValue(normalizedString)
    } else {
      setInputValue('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, labelGetter, valueGetter, allowCustomValue])

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
    
    if (!Array.isArray(options)) {
      setFilteredOptions([])
      setIsOpen(true)
      return
    }

    const filtered = options.filter(option => {
      const optionLabel = toDisplayString(labelGetter(option))
      return optionLabel.toLowerCase().includes(newValue.toLowerCase())
    })
    setFilteredOptions(filtered)
    setIsOpen(true)
  }

  const handleSelectOption = (option) => {
    if (disabled) return
    const optionLabel = toDisplayString(labelGetter(option))
    const optionValue = valueGetter(option)
    setInputValue(optionLabel)
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleFocus = () => {
    if (disabled) return
    setFilteredOptions(Array.isArray(options) ? options : [])
    setIsOpen(true)
  }

  const handleBlur = () => {
    if (disabled) return
    if (!allowCustomValue) {
      const normalized = normalizeValue(value)
      if (!normalized) {
        setInputValue('')
      }
      return
    }

    const hasExactMatch = Array.isArray(options) && options.some(option => {
      const label = toDisplayString(labelGetter(option))
      return label.toLowerCase() === inputValue.toLowerCase()
    })

    if (inputValue && !hasExactMatch) {
      onChange(inputValue)
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
          color: '#111827',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
        }}
      />

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="multi-select-dropdown" style={{ position: 'absolute', width: '100%', zIndex: 10 }}>
          {filteredOptions.map((option, index) => {
            const optionValue = valueGetter(option)
            const optionLabel = toDisplayString(labelGetter(option))
            const key = optionValue != null && optionValue !== ''
              ? String(optionValue)
              : `${optionLabel}-${index}`

            return (
              <div
                key={key}
                className="multi-select-option"
                onMouseDown={(e) => {
                  e.preventDefault() // Prevent blur while selecting
                  handleSelectOption(option)
                }}
                style={{ cursor: 'pointer' }}
              >
                <span>{optionLabel}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

