import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0ff] flex items-center justify-center p-4">
          <div className="glass-card rounded-xl p-8 max-w-lg w-full text-center space-y-5">
            {/* Glitch icon */}
            <div className="text-5xl">💥</div>

            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wider text-[#e94560]">
              ERREUR CRITIQUE
            </h2>

            <p className="text-[#8888aa] font-body text-sm">
              Une erreur inattendue a provoqué le crash de l&apos;application.
            </p>

            {/* Error details */}
            <div className="bg-[#12122a] border border-[#2a2a4a] rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-display tracking-widest text-[#e94560] uppercase">
                Détails
              </p>
              <p className="text-sm font-mono text-[#ffaa00] break-all">
                {this.state.error?.message || "Erreur inconnue"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#0f3460] text-white font-display text-sm tracking-wider rounded-lg
                           hover:bg-[#1a4a80] transition-all"
              >
                RÉESSAYER
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-[#e94560]/50 text-[#e94560] font-display text-sm tracking-wider rounded-lg
                           hover:bg-[#e94560]/10 transition-all"
              >
                RECHARGER LA PAGE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
