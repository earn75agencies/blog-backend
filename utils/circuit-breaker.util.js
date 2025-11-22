/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.name = options.name || 'CircuitBreaker';

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(
          `Circuit breaker ${this.name} is OPEN. Service unavailable.`
        );
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
      // Try to transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      console.log(`🔄 Circuit breaker ${this.name} transitioning to HALF_OPEN`);
    }

    try {
      const result = await fn();

      // Success
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.close();
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      console.warn(
        `⚠️  Circuit breaker ${this.name} failure (${this.failureCount}/${this.failureThreshold}):`,
        error.message
      );

      if (this.failureCount >= this.failureThreshold) {
        this.open();
      }

      // Use fallback if provided
      if (fallback) {
        console.log(`🔄 Using fallback for ${this.name}`);
        return fallback;
      }

      throw error;
    }
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.timeout;
    console.error(`❌ Circuit breaker ${this.name} is now OPEN`);
  }

  /**
   * Close the circuit
   */
  close() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`✅ Circuit breaker ${this.name} is now CLOSED`);
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }
}

/**
 * Circuit breaker decorator for async functions
 */
const withCircuitBreaker = (fn, options = {}) => {
  const breaker = new CircuitBreaker({
    name: options.name || fn.name || 'AsyncFunction',
    ...options,
  });

  return async (...args) => {
    return breaker.execute(() => fn(...args), options.fallback);
  };
};

/**
 * Create circuit breakers for critical services
 */
const createServiceCircuitBreakers = () => {
  return {
    database: new CircuitBreaker({ name: 'Database', timeout: 30000 }),
    cache: new CircuitBreaker({ name: 'Cache', timeout: 15000 }),
    email: new CircuitBreaker({ name: 'Email', timeout: 60000 }),
    externalApi: new CircuitBreaker({ name: 'ExternalAPI', timeout: 45000 }),
    search: new CircuitBreaker({ name: 'Search', timeout: 30000 }),
  };
};

module.exports = {
  CircuitBreaker,
  withCircuitBreaker,
  createServiceCircuitBreakers,
};
