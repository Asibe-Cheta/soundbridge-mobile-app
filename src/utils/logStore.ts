/**
 * Global Log Store for Debug Panel
 * Stores logs in memory for the debug panel to display
 */

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
}

class LogStore {
  private logs: LogEntry[] = [];
  private maxLogs = 200;
  private listeners: Set<() => void> = new Set();

  addLog(level: LogEntry['level'], ...args: any[]): void {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };

    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener());

    // Also log to console
    const consoleMethod = console[level] || console.log;
    consoleMethod(...args);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getFilteredLogs(filter: string): LogEntry[] {
    if (!filter) return this.getLogs();
    const lowerFilter = filter.toLowerCase();
    return this.getLogs().filter(log => 
      log.message.toLowerCase().includes(lowerFilter) ||
      log.level.toLowerCase().includes(lowerFilter)
    );
  }
}

export const logStore = new LogStore();

// Helper functions to use in code
export const debugLog = (...args: any[]) => logStore.addLog('log', ...args);
export const debugError = (...args: any[]) => logStore.addLog('error', ...args);
export const debugWarn = (...args: any[]) => logStore.addLog('warn', ...args);
export const debugInfo = (...args: any[]) => logStore.addLog('info', ...args);

