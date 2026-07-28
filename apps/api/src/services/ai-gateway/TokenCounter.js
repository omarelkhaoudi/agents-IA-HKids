export class TokenCounter {
  estimate(text = '') {
    if (!text) {
      return 0;
    }

    return Math.max(1, Math.ceil(String(text).length / 4));
  }

  estimateMessages(systemPrompt = '', messages = []) {
    const promptText = [
      systemPrompt,
      ...messages.map((message) => `${message.role}: ${message.content}`),
    ].join('\n');

    return this.estimate(promptText);
  }
}
