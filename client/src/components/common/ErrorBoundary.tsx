import { Component, ReactNode } from 'react';
import { STRINGS } from '../../constants/strings';

/**
 * Error Boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to show on error */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component
 *
 * Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (could be sent to error reporting service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h1 className="error-boundary__title">
              {STRINGS.ERROR_BOUNDARY_TITLE}
            </h1>
            <p className="error-boundary__message">
              {STRINGS.ERROR_BOUNDARY_MESSAGE}
            </p>
            <button
              type="button"
              className="error-boundary__button"
              onClick={this.handleRetry}
            >
              {STRINGS.ERROR_BOUNDARY_RETRY}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
