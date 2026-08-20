import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';
import Button from './Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-12 text-slate-900">
          <div className="w-full max-w-lg rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <TriangleAlert className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-[32px] font-bold tracking-[-0.04em]">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The app hit an unexpected issue. You can try again or reload the page.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={this.reset}>
                Try again
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
