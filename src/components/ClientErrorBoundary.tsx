"use client";
import React from "react";

type Props = { children: React.ReactNode };

export default class ClientErrorBoundary extends React.Component<Props, { error: Error | null; info: string | null }> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console and set state so UI shows stack during dev
    // eslint-disable-next-line no-console
    console.error("ClientErrorBoundary caught:", error, info);
    this.setState({ error, info: info.componentStack });

    // Send to server debug endpoint (best-effort, don't block)
    try {
      fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: error.message, stack: info.componentStack, url: typeof window !== 'undefined' ? window.location.href : null }),
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4">
          <h2 className="text-red-600">Se produjo un error en el cliente</h2>
          <div className="font-mono text-sm whitespace-pre-wrap">{String(this.state.error && this.state.error.message)}</div>
          <details className="mt-2">
            <summary>Ver stack</summary>
            <pre className="font-mono text-sm whitespace-pre-wrap">{this.state.info}</pre>
          </details>
        </div>
      );
    }
    return this.props.children as any;
  }
}
