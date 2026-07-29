import { apiRequest, getAccessToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getSalesAgentBootstrap() {
  return apiRequest('/api/sales-agent/bootstrap');
}

export async function searchSalesAgent(query: string) {
  return apiRequest(`/api/sales-agent/search?q=${encodeURIComponent(query)}`);
}

export async function createSalesCompany(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSalesProspect(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/prospects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSalesProduct(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSalesDeal(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/deals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function moveSalesDeal(id: string, stage: string) {
  return apiRequest(`/api/sales-agent/deals/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ stage }),
  });
}

export async function generateSalesDocument(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateSalesQuotation(payload: Record<string, unknown>) {
  return apiRequest('/api/sales-agent/generate-quotation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitSalesQuotationReview(id: string) {
  return apiRequest(`/api/sales-agent/quotations/${id}/submit-review`, { method: 'POST' });
}

export async function approveSalesQuotation(id: string) {
  return apiRequest(`/api/sales-agent/quotations/${id}/approve`, { method: 'POST' });
}

export async function rejectSalesQuotation(id: string) {
  return apiRequest(`/api/sales-agent/quotations/${id}/reject`, { method: 'POST' });
}

export async function submitSalesDocumentReview(id: string) {
  return apiRequest(`/api/sales-agent/documents/${id}/submit-review`, { method: 'POST' });
}

export async function approveSalesDocument(id: string) {
  return apiRequest(`/api/sales-agent/documents/${id}/approve`, { method: 'POST' });
}

export async function rejectSalesDocument(id: string) {
  return apiRequest(`/api/sales-agent/documents/${id}/reject`, { method: 'POST' });
}

async function downloadExport(url: string, fallbackName: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Unable to export.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function exportSalesQuotation(
  id: string,
  format: 'markdown' | 'html' | 'pdf' | 'docx' = 'markdown'
) {
  await downloadExport(
    `${API_BASE_URL}/api/sales-agent/quotations/${id}/export?format=${format}`,
    `quotation.${format === 'markdown' ? 'md' : format}`
  );
}

export async function exportSalesDocument(id: string, format: 'markdown' | 'html' = 'markdown') {
  await downloadExport(
    `${API_BASE_URL}/api/sales-agent/documents/${id}/export?format=${format}`,
    `document.${format === 'markdown' ? 'md' : format}`
  );
}
