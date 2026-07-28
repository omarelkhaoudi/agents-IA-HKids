export class TimeoutManager {
  constructor({ timeoutMs = 30000 } = {}) {
    this.timeoutMs = timeoutMs;
  }

  async execute(operation, { timeoutMs = this.timeoutMs } = {}) {
    let timeoutId;

    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`AI request timed out after ${timeoutMs}ms.`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
