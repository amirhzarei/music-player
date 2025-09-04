import React from 'react';

interface State { hasError: boolean; error?: any; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
    override state: State = { hasError: false };
    static getDerivedStateFromError(error: unknown): Partial<State> {
        return { hasError: true, error };
    }
    override componentDidCatch(error: unknown, info: React.ErrorInfo) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', error, info);
    }
    override render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 text-sm text-red-400">
                    Something went wrong. Check console. <button onClick={() => location.reload()} className="underline">Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}