export class PromptAssembler {
  constructor({ knowledgeContextBuilder }) {
    this.knowledgeContextBuilder = knowledgeContextBuilder;
  }

  assemble({ prompt, selectedDocuments, currentContext, retrievedContext }) {
    const knowledgeContext = this.knowledgeContextBuilder.build({
      selectedDocuments,
      currentContext,
    });

    return [
      `Agent Name: ${prompt.name}`,
      `Description: ${prompt.description}`,
      `Role: ${prompt.role}`,
      `Objective: ${prompt.objective}`,
      '',
      'System Prompt:',
      prompt.systemPrompt,
      '',
      'Instructions:',
      ...prompt.instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
      '',
      'Constraints:',
      ...prompt.constraints.map((constraint, index) => `${index + 1}. ${constraint}`),
      '',
      'Validation Checklist:',
      ...prompt.validationChecklist.map((item, index) => `${index + 1}. ${item}`),
      '',
      'Output Style:',
      prompt.outputStyle,
      '',
      knowledgeContext,
      '',
      'Automatically Retrieved Context:',
      retrievedContext?.assembledContext || 'No retrieved context available.',
    ].join('\n');
  }
}
