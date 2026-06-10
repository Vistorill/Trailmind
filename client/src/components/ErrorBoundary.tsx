import { Component, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-slate-400 mb-6">Ocorreu um erro inesperado. Tente recarregar a página.</p>
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
