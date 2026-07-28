import { databasePool } from './database-runtime.js';
import { ContentCatalogService } from '../services/content/ContentCatalogService.js';

export const contentCatalogService = new ContentCatalogService(databasePool);

export async function initializeContentRuntime() {
  await contentCatalogService.initialize();
}

export function listDocuments() {
  return contentCatalogService.listDocuments();
}

export function listPrompts() {
  return contentCatalogService.listPrompts();
}

export function listDocumentSources() {
  return contentCatalogService.listDocumentSources();
}

export async function createDocument(payload) {
  return contentCatalogService.createDocument(payload);
}

export async function updateDocument(documentId, payload) {
  return contentCatalogService.updateDocument(documentId, payload);
}

export async function removeDocument(documentId) {
  return contentCatalogService.removeDocument(documentId);
}

export function createDocumentSource(document) {
  return {
    documentId: document.id,
    content: document.content || '',
    priority: document.status === 'active' ? 2 : 1,
  };
}

export function updateDocumentSource() {
  return null;
}

export function removeDocumentSource() {
  return null;
}

export async function createPrompt(payload) {
  return contentCatalogService.createPrompt(payload);
}

export async function updatePrompt(promptId, payload) {
  return contentCatalogService.updatePrompt(promptId, payload);
}

export async function removePrompt(promptId) {
  return contentCatalogService.removePrompt(promptId);
}
