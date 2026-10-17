import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider, useI18n, type Locale } from './i18n'
import './index.css'
import './hyman-shell.css'
import './office/office-overview.css'
import './org/talent-localization.css'
import './org/architecture-icons.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; locale: Locale },
  { error: Error | null; info: string }
> {
  state = { error: null as Error | null, info: '' }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] React crashed:', error, errorInfo)
    this.setState({ info: errorInfo.componentStack ?? '' })
  }

  render() {
    const text = (en: string, zh: string) => this.props.locale === 'zh-CN' ? zh : en
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#DA8D86', background: '#090D0E', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>{text('UI Error — React crashed', '界面出现错误')}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <details open style={{ marginTop: 12, fontSize: 12, color: '#ccc' }}>
            <summary>{text('Stack trace', '错误堆栈')}</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          </details>
          {this.state.info && (
            <details style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
              <summary>{text('Component stack', '组件堆栈')}</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.info}</pre>
            </details>
          )}
          <button
            onClick={() => { this.setState({ error: null, info: '' }) }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#F3F2EC', color: '#090D0E', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            {text('Try to recover', '尝试恢复')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function LocalizedErrorBoundary({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  return <ErrorBoundary locale={locale}>{children}</ErrorBoundary>
}

// Global error handler for uncaught JS errors
window.addEventListener('error', (e) => {
  console.error('[Global] Uncaught error:', e.error ?? e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Global] Unhandled promise rejection:', e.reason)
})

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML = '<h1 style="color:red">Root element not found</h1>'
  throw new Error('Root element #root not found')
}

try {
  createRoot(root).render(
      <I18nProvider>
        <LocalizedErrorBoundary>
        <App />
        </LocalizedErrorBoundary>
      </I18nProvider>
  )
} catch (err) {
  console.error('React render error:', err)
  root.innerHTML = `<h1 style="color:red">React Error: ${err}</h1>`
}
