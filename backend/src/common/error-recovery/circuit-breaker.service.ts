import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms before attempting to reset
  monitoringPeriod: number; // Time window for counting failures
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, {
    state: CircuitState;
    failures: number;
    lastFailureTime?: Date;
    successCount: number;
    options: CircuitBreakerOptions;
  }> = new Map();

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    provider: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(provider, options);
    const now = new Date();

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (circuit.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuit, now)) {
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successCount = 0;
        this.logger.log(`Circuit breaker for ${provider} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker for ${provider} is OPEN. Service unavailable.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(circuit, now);
      return result;
    } catch (error) {
      this.onFailure(circuit, now);
      throw error;
    }
  }

  /**
   * Get current state of circuit breaker
   */
  getState(provider: string): CircuitState {
    const circuit = this.circuits.get(provider);
    return circuit?.state || CircuitState.CLOSED;
  }

  /**
   * Reset circuit breaker manually
   */
  reset(provider: string): void {
    const circuit = this.circuits.get(provider);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successCount = 0;
      circuit.lastFailureTime = undefined;
      this.logger.log(`Circuit breaker for ${provider} manually reset`);
    }
  }

  private getOrCreateCircuit(
    provider: string,
    options?: Partial<CircuitBreakerOptions>,
  ) {
    if (!this.circuits.has(provider)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 60000, // 1 minute
      };

      this.circuits.set(provider, {
        state: CircuitState.CLOSED,
        failures: 0,
        successCount: 0,
        options: { ...defaultOptions, ...options },
      });
    }

    return this.circuits.get(provider)!;
  }

  private shouldAttemptReset(circuit: any, now: Date): boolean {
    if (!circuit.lastFailureTime) return false;
    const elapsed = now.getTime() - circuit.lastFailureTime.getTime();
    return elapsed >= circuit.options.resetTimeout;
  }

  private onSuccess(circuit: any, now: Date): void {
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      // If we get a few successes in HALF_OPEN, close the circuit
      if (circuit.successCount >= 2) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        this.logger.log('Circuit breaker closed after successful recovery');
      }
    } else {
      // Reset failure count on success
      circuit.failures = 0;
    }
  }

  private onFailure(circuit: any, now: Date): void {
    circuit.failures++;
    circuit.lastFailureTime = now;

    if (circuit.failures >= circuit.options.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      this.logger.warn(
        `Circuit breaker opened after ${circuit.failures} failures`,
      );
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      // If we fail in HALF_OPEN, go back to OPEN
      circuit.state = CircuitState.OPEN;
      this.logger.warn('Circuit breaker reopened after failure in HALF_OPEN state');
    }
  }
}

