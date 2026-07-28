import type { DocumentKind } from '../../types/assistant';
import DeliveryNotePreview from './DeliveryNotePreview';
import EmailPreview from './EmailPreview';
import InvoicePreview from './InvoicePreview';
import LetterPreview from './LetterPreview';
import PurchaseOrderPreview from './PurchaseOrderPreview';
import QuotationPreview from './QuotationPreview';

interface DocumentPreviewProps {
  actionId: DocumentKind;
}

export default function DocumentPreview({ actionId }: DocumentPreviewProps) {
  switch (actionId) {
    case 'quotation':
      return <QuotationPreview />;
    case 'invoice':
      return <InvoicePreview />;
    case 'purchase-order':
      return <PurchaseOrderPreview />;
    case 'delivery-note':
      return <DeliveryNotePreview />;
    case 'letter':
      return <LetterPreview />;
    case 'email':
      return <EmailPreview />;
    default:
      return null;
  }
}
