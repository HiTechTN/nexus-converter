import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApiErrorDisplay, { parseApiError } from "../ApiErrorDisplay";

describe("parseApiError", () => {
  it("returns empty object for null/undefined", () => {
    expect(parseApiError(null)).toEqual({});
    expect(parseApiError(undefined)).toEqual({});
  });

  it("returns structured error if already an ApiError", () => {
    const err = { code: "ECONNREFUSED", error: "Proxy error" };
    expect(parseApiError(err)).toEqual(err);
  });

  it("detects EADDRNOTAVAIL from string message", () => {
    const result = parseApiError("connect EADDRNOTAVAIL ::1:3000");
    expect(result.code).toBe("EADDRNOTAVAIL");
    expect(result.error).toBe("Proxy error");
  });

  it("detects ECONNREFUSED from string message", () => {
    const result = parseApiError("connect ECONNREFUSED 127.0.0.1:3000");
    expect(result.code).toBe("ECONNREFUSED");
    expect(result.error).toBe("Proxy error");
  });

  it("detects Proxy error from string message", () => {
    const result = parseApiError("Proxy error: something went wrong");
    expect(result.error).toBe("Proxy error");
  });

  it("returns plain error message for unknown errors", () => {
    const result = parseApiError("Something broke");
    expect(result.error).toBe("Something broke");
    expect(result.code).toBeUndefined();
  });

  it("handles Error objects", () => {
    const err = new Error("connect ECONNREFUSED 127.0.0.1:3000");
    const result = parseApiError(err);
    expect(result.code).toBe("ECONNREFUSED");
  });
});

describe("ApiErrorDisplay", () => {
  it("renders nothing when error is null", () => {
    const { container } = render(<ApiErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("displays a simple error with human-friendly label", () => {
    render(<ApiErrorDisplay error="Something failed" />);
    // parseApiError wraps it, shows friendly label and hint
    expect(screen.getByText("Erreur de connexion")).toBeInTheDocument();
    expect(screen.getByText("Redémarrez l\'application et réessayez.")).toBeInTheDocument();
  });

  it("displays structured error with code badge", () => {
    render(
      <ApiErrorDisplay
        error={{ error: "Proxy error", code: "ECONNREFUSED", target: "http://localhost:3000" }}
      />
    );
    expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();
    expect(screen.getByText("→ http://localhost:3000")).toBeInTheDocument();
  });

  it("shows human-friendly label for EADDRNOTAVAIL", () => {
    render(
      <ApiErrorDisplay
        error={{ error: "Proxy error", code: "EADDRNOTAVAIL" }}
      />
    );
    expect(screen.getByText("Serveur API indisponible")).toBeInTheDocument();
  });

  it("shows human-friendly label for ECONNREFUSED", () => {
    render(
      <ApiErrorDisplay
        error={{ error: "Proxy error", code: "ECONNREFUSED" }}
      />
    );
    expect(screen.getByText("Connexion refusée par le serveur")).toBeInTheDocument();
  });

  it("shows hint text", () => {
    render(
      <ApiErrorDisplay
        error={{ error: "Proxy error", code: "ECONNREFUSED" }}
      />
    );
    expect(
      screen.getByText("Le serveur API refuse les connexions. Redémarrez-le avec ./start.sh")
    ).toBeInTheDocument();
  });

  it("calls onDismiss when close button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <ApiErrorDisplay
        error={{ error: "Test error" }}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText("Fermer"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <ApiErrorDisplay
        error={{ error: "Test error" }}
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByText("RÉESSAYER"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when onRetry is not provided", () => {
    render(<ApiErrorDisplay error={{ error: "Test error" }} />);
    expect(screen.queryByText("RÉESSAYER")).not.toBeInTheDocument();
  });

  it("shows collapsible technical details when message differs from error", () => {
    render(
      <ApiErrorDisplay
        error={{
          error: "Proxy error",
          code: "ECONNREFUSED",
          message: "connect ECONNREFUSED 127.0.0.1:3000",
        }}
      />
    );
    expect(screen.getByText("Détails techniques")).toBeInTheDocument();
    expect(
      screen.getByText("connect ECONNREFUSED 127.0.0.1:3000")
    ).toBeInTheDocument();
  });

  it("auto-detects proxy errors from string input", () => {
    render(<ApiErrorDisplay error="Proxy error: ECONNREFUSED" />);
    expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();
  });
});
