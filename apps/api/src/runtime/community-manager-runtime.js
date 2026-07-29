import { CommunityManagerRepository } from '../repositories/CommunityManagerRepository.js';
import { CommunityManagerService } from '../services/community-manager/CommunityManagerService.js';
import { aiGateway, retrievalService } from './assistant-runtime.js';
import { listDocuments, listPrompts } from './content-runtime.js';
import { databasePool } from './database-runtime.js';

const repository = new CommunityManagerRepository(databasePool);

export const communityManagerService = new CommunityManagerService({
  repository,
  aiGateway,
  retrievalService,
  listDocuments,
  listPrompts,
});

export async function initializeCommunityManagerRuntime() {
  await communityManagerService.initialize();
}
