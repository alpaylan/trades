import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; errorInfo: ErrorInfo | null };

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null, errorInfo: null };

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ errorInfo });
		console.error("ErrorBoundary caught:", error, errorInfo);
	}

	render() {
		if (this.state.error) {
			return (
				<div
					style={{
						padding: 24,
						maxWidth: 600,
						margin: "24px auto",
						background: "#ffebee",
						border: "2px solid #c62828",
						borderRadius: 8,
						fontFamily: "monospace",
						fontSize: 13,
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}
				>
					<div style={{ fontWeight: 700, marginBottom: 8, color: "#b71c1c" }}>Hata (Error)</div>
					<div style={{ marginBottom: 8 }}>{this.state.error.message}</div>
					{this.state.error.stack && (
						<details style={{ marginTop: 8 }}>
							<summary style={{ cursor: "pointer" }}>Stack</summary>
							<pre style={{ margin: "8px 0 0", overflow: "auto" }}>{this.state.error.stack}</pre>
						</details>
					)}
					{this.state.errorInfo?.componentStack && (
						<details style={{ marginTop: 8 }}>
							<summary style={{ cursor: "pointer" }}>Component stack</summary>
							<pre style={{ margin: "8px 0 0", overflow: "auto" }}>
								{this.state.errorInfo.componentStack}
							</pre>
						</details>
					)}
					<button
						type="button"
						onClick={() => this.setState({ error: null, errorInfo: null })}
						style={{
							marginTop: 12,
							padding: "8px 16px",
							cursor: "pointer",
							background: "#c62828",
							color: "#fff",
							border: "none",
							borderRadius: 6,
						}}
					>
						Kapat / Close
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
