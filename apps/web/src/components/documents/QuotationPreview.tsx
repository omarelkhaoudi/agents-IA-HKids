import PreviewFrame from './PreviewFrame';

export default function QuotationPreview() {
  return (
    <PreviewFrame title="Quotation" subtitle="Prepared for Greenfield Nursery">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">H-Kids</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">Quotation QT-2026-104</h3>
          <p className="mt-2 text-sm text-slate-500">Issued on 28 Jul 2026 | Valid for 30 days</p>
        </div>
        <div className="text-sm leading-6 text-slate-600">
          <p>14 Avenue des Orangers</p>
          <p>Casablanca, Morocco</p>
          <p>finance@hkids.app</p>
        </div>
      </header>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prepared For</p>
          <p className="mt-2 text-lg font-semibold">Greenfield Nursery</p>
          <p className="text-sm text-slate-600">Administrative & transport coordination unit</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scope</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Operational coordination, after-school administrative support, and communication follow-up.
          </p>
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-medium">Service</th>
            <th className="pb-3 font-medium">Qty</th>
            <th className="pb-3 font-medium">Unit Price</th>
            <th className="pb-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-4">Transport coordination support</td>
            <td className="py-4">4 months</td>
            <td className="py-4">MAD 7,500</td>
            <td className="py-4 text-right">MAD 30,000</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4">Administrative follow-up package</td>
            <td className="py-4">4 months</td>
            <td className="py-4">MAD 4,500</td>
            <td className="py-4 text-right">MAD 18,000</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-sm space-y-2 rounded-3xl bg-slate-50 p-5">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>MAD 48,000</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT</span>
            <span>MAD 9,600</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
            <span>Total</span>
            <span>MAD 57,600</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
