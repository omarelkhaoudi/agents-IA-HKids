import { TrainingCenterRepository } from '../repositories/TrainingCenterRepository.js';
import { TrainingCenterService } from '../services/training-center/TrainingCenterService.js';
import { databasePool } from './database-runtime.js';

const repository = new TrainingCenterRepository(databasePool);
export const trainingCenterService = new TrainingCenterService({ repository });

export async function initializeTrainingCenterRuntime() {
  await trainingCenterService.initialize();
}
