import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestLogger, errorLogger, clientDisconnectHandler } from "../logger.js";

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/api/test",
    on: vi.fn((event: string, cb: Function) => {
      return {} as any;
    }),
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    statusCode: 200,
    headersSent: false,
    end: vi.fn(),
    writeHead: vi.fn(),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("requestLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls next()", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("logs successful non-health-check requests", () => {
    const req = createMockReq({ path: "/api/media/info" });
    const res = createMockRes();
    const next = vi.fn();

    requestLogger(req, res, next);
    // Simulate response end
    res.end("ok");

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("skips logging health check on success", () => {
    const req = createMockReq({ path: "/api/healthz" });
    const res = createMockRes();
    const next = vi.fn();

    requestLogger(req, res, next);
    res.end("ok");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("logs health check on error (status >= 400)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const req = createMockReq({ path: "/api/healthz" });
    const res = createMockRes();
    (res as any).statusCode = 500;
    const next = vi.fn();

    requestLogger(req, res, next);
    res.end("error");

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("errorLogger", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("sends 500 JSON response with error message", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();
    const err = new Error("Test error");

    errorLogger(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Erreur interne du serveur",
        message: "Test error",
      })
    );
  });

  it("logs the error details to console", () => {
    const req = createMockReq({ method: "POST", path: "/api/media/convert" });
    const res = createMockRes();
    const next = vi.fn();
    const err = new Error("Conversion failed");

    errorLogger(err, req, res, next);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("does not send response if headers already sent", () => {
    const req = createMockReq();
    const res = createMockRes();
    (res as any).headersSent = true;
    const next = vi.fn();

    errorLogger(new Error("Test"), req, res, next);

    expect(res.json).not.toHaveBeenCalled();
  });

  it("omits message field in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();
    const err = new Error("Sensitive error");

    errorLogger(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Erreur interne du serveur",
      })
    );
    const callArgs = (res.json as any).mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("message");
    process.env.NODE_ENV = originalEnv;
  });

  it("detects ECONNRESET errors", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();
    const err = new Error("read ECONNRESET");

    errorLogger(err, req, res, next);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("clientDisconnectHandler", () => {
  it("calls next()", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    clientDisconnectHandler(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("attaches error listener to request", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    clientDisconnectHandler(req, res, next);

    expect(req.on).toHaveBeenCalledWith("error", expect.any(Function));
  });
});
