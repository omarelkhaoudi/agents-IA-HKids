import PreviewFrame from './PreviewFrame';

export default function InvoicePreview() {
  return (
    <PreviewFrame title="Invoice" subtitle="Monthly administrative support billing">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Invoice</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">INV-2026-071</h3>
          <p className="mt-2 text-sm text-slate-500">Issue date: 28 Jul 2026 | Due date: 12 Aug 2026</p>
        </div>
        <div className="text-sm leading-6 text-slate-600">
          <p>Bill To: Greenfield Nursery</p>
          <p>Attn: Mina Rahal</p>
          <p>billing@greenfield.example</p>
        </div>
      </header>

      <table className="mt-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Hours</th>
            <th className="pb-3 font-medium">Rate</th>
            <th className="pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-4">Administrative support coordination</td>
            <td className="py-4">32</td>
            <td className="py-4">MAD 500</td>
            <td className="py-4 text-right">MAD 16,000</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4">Procurement follow-up and supplier liaison</td>
            <td className="py-4">18</td>
            <td className="py-4">MAD 450</td>
            <td className="py-4 text-right">MAD 8,100</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Payment terms: bank transfer within 15 days. Please reference invoice number on all payments.
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>MAD 24,100</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span>VAT</span>
            <span>MAD 4,820</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
            <span>Total due</span>
            <span>MAD 28,920</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
