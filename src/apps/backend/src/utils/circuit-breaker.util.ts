export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number; // Time in ms before attempting to reset the breaker
  shouldTrip?: (error: any) => boolean; // Function to determine if error should count as failure
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly shouldTrip: (error: any) => boolean;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold || 3;
    this.successThreshold = options?.successThreshold || 2;
    this.timeout = options?.timeout || 30000; // 30 seconds default
    this.shouldTrip = options?.shouldTrip || (() => true);
  }

  async fire<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.nextAttempt > Date.now()) {
        throw new CircuitBreakerError('Circuit is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const response = await action();
      this.onSuccess();
      return response;
    } catch (err) {
      if (this.shouldTrip(err)) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.successCount = 0;
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

/**
 * Utility to retry a promise-returning function with exponential backoff.
 */
export async function withRetry<T>(
  action: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (err: any) {
      lastError = err;
      if (err instanceof CircuitBreakerError) {
        throw err; // Do not retry if circuit is open
      }
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
