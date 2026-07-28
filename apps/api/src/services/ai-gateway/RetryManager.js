export class RetryManager {
  constructor({ maxRetries = 2 } = {}) {
    this.maxRetries = maxRetries;
  }

  async execute(operation, { maxRetries = this.maxRetries } = {}) {
    let attempt = 0;
    let lastError;

    while (attempt <= maxRetries) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          break;
        }

        const delayMs = 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
      }
    }

    throw lastError;
  }
}
