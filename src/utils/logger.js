/**
 * Development-only logger utility
 * 
 * Prevents console logs from appearing in production builds.
 * Automatically disabled when NODE_ENV !== 'development' or MODE !== 'development'.
 * 
 * Usage:
 *   import { logger } from './utils/logger'
 *   logger.log('User logged in:', userData)
 *   logger.error('API call failed:', error)
 *   logger.warn('Slow network detected')
 *   logger.info('Loading contacts...')
 *   logger.debug('State updated:', newState)
 */

const isDevelopment = import.meta.env.MODE === 'development'

/**
 * Logger utility that only outputs in development mode
 */
export const logger = {
  /**
   * General log message (replaces console.log)
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Error message (replaces console.error)
   */
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },

  /**
   * Warning message (replaces console.warn)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  /**
   * Info message (replaces console.info)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * Debug message (replaces console.debug)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  /**
   * Table output (replaces console.table)
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  /**
   * Group start (replaces console.group)
   */
  group: (label) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  /**
   * Group end (replaces console.groupEnd)
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },

  /**
   * Timer start (replaces console.time)
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(label)
    }
  },

  /**
   * Timer end (replaces console.timeEnd)
   */
  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  }
}

/**
 * Enhanced error logger for production monitoring
 * Can be extended to send errors to monitoring service (e.g., Sentry, LogRocket)
 */
export const logError = (error, context = '', additionalData = {}) => {
  // Always log errors in development
  if (isDevelopment) {
    console.group(`❌ Error in ${context}`)
    console.error('Error:', error)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    if (Object.keys(additionalData).length > 0) {
      console.error('Additional Data:', additionalData)
    }
    console.groupEnd()
  } else {
    // In production, you could send to monitoring service
    // Example: Sentry.captureException(error, { tags: { context }, extra: additionalData })
    
    // For now, just store critical info
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      ...additionalData
    }
    
    // You could send this to a logging service
    // sendToLoggingService(errorInfo)
  }
}

/**
 * Performance logger for tracking slow operations
 */
export const logPerformance = (label, duration) => {
  if (isDevelopment) {
    const color = duration < 100 ? 'green' : duration < 500 ? 'orange' : 'red'
    console.log(`⏱️ %c${label}: ${duration}ms`, `color: ${color}; font-weight: bold`)
  }
}

/**
 * API call logger for debugging network requests
 */
export const logApiCall = (method, url, data = null, response = null, error = null) => {
  if (isDevelopment) {
    console.group(`🌐 API ${method} ${url}`)
    if (data) console.log('Request Data:', data)
    if (response) console.log('Response:', response)
    if (error) console.error('Error:', error)
    console.groupEnd()
  }
}

export default logger
