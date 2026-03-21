import React from 'react';
import { Alert } from './ui/alert';
import { CircleAlert as AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert className="border-red-900/50 bg-red-950/30 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-3">
                <p className="font-semibold">Something went wrong</p>
                <p className="text-sm mt-1 text-red-200/70">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
