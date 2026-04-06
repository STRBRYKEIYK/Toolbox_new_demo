/**
 * Secure Logger Utility
 * Prevents sensitive data from being exposed in production console logs
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug'

class SecureLogger {
  private enabled: boolean

  constructor() {
    this.enabled = isDevelopment
  }

  private sanitize(data: any): any {
    if (!data) return data
    
    // Don't sanitize in development
    if (this.enabled) return data

    // Sanitize sensitive data in production
    if (typeof data === 'object') {
      const sanitized: any = Array.isArray(data) ? [] : {}
      for (const key in data) {
        // Hide potentially sensitive fields
        if (/(password|token|secret|key|auth|credential|ssn|card)/i.test(key)) {
          sanitized[key] = '[REDACTED]'
        } else if (typeof data[key] === 'object') {
          sanitized[key] = this.sanitize(data[key])
        } else {
          sanitized[key] = data[key]
        }
      }
      return sanitized
    }
    
    return data
  }

  private logInternal(level: LogLevel, ...args: any[]): void {
    if (!this.enabled) return

    const sanitizedArgs = args.map(arg => this.sanitize(arg))
    console[level](...sanitizedArgs)
  }

  public info(...args: any[]): void {
    this.logInternal('info', ...args)
  }

  public log(...args: any[]): void {
    this.logInternal('log', ...args)
  }

  public warn(...args: any[]): void {
    this.logInternal('warn', ...args)
  }

  public error(...args: any[]): void {
    // Errors should still be logged in production but sanitized
    if (!this.enabled) {
      const sanitizedArgs = args.map(arg => this.sanitize(arg))
      console.error(...sanitizedArgs)
    } else {
      console.error(...args)
    }
  }

  public debug(...args: any[]): void {
    this.logInternal('debug', ...args)
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  public isEnabled(): boolean {
    return this.enabled
  }
}

// Export singleton instance
export const logger = new SecureLogger()

// Disable all console logs in production
if (!isDevelopment) {
  const noop = () => {}
  console.log = noop
  console.info = noop
  console.debug = noop
  console.warn = noop
  // Keep console.error for critical errors but they'll be sanitized via logger
}

export default logger
