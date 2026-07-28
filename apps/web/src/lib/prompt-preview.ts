import type { PromptDefinition } from '../types/prompts';

export function buildPromptPreview(prompt: PromptDefinition | null): string {
  if (!prompt) {
    return '';
  }

  return [
    `Agent Name: ${prompt.name}`,
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
  ].join('\n');
}
