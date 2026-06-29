import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Catches render errors so a single failure shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-spectrum shadow-[0_0_24px_rgba(255,138,107,0.5)]" />
            <h1 className="text-lg font-medium">Something went wrong</h1>
            <p className="text-sm text-muted">The page hit an unexpected error. Reloading usually fixes it.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
