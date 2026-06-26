import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

// Component that throws on render
function ThrowingComponent({ message }: { message: string }) {
  throw new Error(message);
}

// Component that renders normally
function WorkingComponent() {
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders default crash UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText("ERREUR CRITIQUE")).toBeInTheDocument();
    expect(screen.getByText("Test crash")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("ERREUR CRITIQUE")).not.toBeInTheDocument();
  });

  it("recovers when child stops throwing after reset", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>
    );

    expect(screen.getByText("ERREUR CRITIQUE")).toBeInTheDocument();

    // Click reset — but since the child still throws, it will re-catch
    // Instead, test with a toggle component
    let shouldThrow = true;
    function ToggleThrow() {
      if (shouldThrow) throw new Error("Dynamic error");
      return <div>Recovered</div>;
    }

    rerender(
      <ErrorBoundary>
        <ToggleThrow />
      </ErrorBoundary>
    );

    // Stop throwing before reset
    shouldThrow = false;
    fireEvent.click(screen.getByText("RÉESSAYER"));

    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });

  it("logs error to console.error", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Logged error" />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[ErrorBoundary]",
      expect.any(Error),
      expect.anything()
    );
  });
});
