import { contentCatalogService } from './content-runtime.js';

export const knowledgePlatformService = contentCatalogService.knowledgePlatform;

knowledgePlatformService.refreshCaches = () => contentCatalogService.refreshCaches();

export async function getKnowledgeBootstrap() {
  return knowledgePlatformService.getBootstrap();
}
