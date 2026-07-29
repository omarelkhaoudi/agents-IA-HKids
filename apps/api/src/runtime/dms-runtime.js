import { contentCatalogService } from './content-runtime.js';

export const documentManagementService = contentCatalogService.documentManagement;

documentManagementService.refreshCaches = () => contentCatalogService.refreshCaches();

export async function getDmsBootstrap() {
  return documentManagementService.getBootstrap();
}

export function wireDmsRuntime({ scheduleRefreshIndex }) {
  documentManagementService.scheduleRefreshIndex = scheduleRefreshIndex || (() => {});
}
