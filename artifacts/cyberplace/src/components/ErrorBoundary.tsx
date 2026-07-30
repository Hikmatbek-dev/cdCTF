import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
    // If it's a dynamic module import failure (chunk deployment mismatch), auto-reload once
    if (
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed")
    ) {
      const refreshed = sessionStorage.getItem("chunk_auto_reload") === "true";
      if (!refreshed) {
        sessionStorage.setItem("chunk_auto_reload", "true");
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem("chunk_auto_reload");
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.error?.message?.includes("Importing a module script failed");

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center border-border shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center mx-auto text-destructive">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">
                {isChunkError ? "Yangi versiya joylandi" : "Xatolik yuz berdi"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isChunkError
                  ? "Platforma yangilandi. Sahifani qayta yuklash orqali yangi versiyani olishingiz mumkin."
                  : "Sahifani yuklashda kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang."}
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="cyber-button w-full h-12 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              <span>Sahifani yangilash</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
