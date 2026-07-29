import { contentCatalogService } from './content-runtime.js';

export const promptPlatformService = contentCatalogService.promptPlatform;

promptPlatformService.refreshCaches = () => contentCatalogService.refreshCaches();

export async function getPromptPlatformBootstrap() {
  return promptPlatformService.getBootstrap();
}

export function wirePromptPlatformRuntime({ aiGateway, retrievalService, listDocuments }) {
  promptPlatformService.aiGateway = aiGateway;
  promptPlatformService.retrievalService = retrievalService;
  promptPlatformService.listDocuments = listDocuments;
}
