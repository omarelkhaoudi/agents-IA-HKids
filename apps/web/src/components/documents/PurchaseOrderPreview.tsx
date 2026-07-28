import PreviewFrame from './PreviewFrame';

export default function PurchaseOrderPreview() {
  return (
    <PreviewFrame title="Purchase Order" subtitle="Educational materials procurement">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Purchase Order</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">PO-2026-212</h3>
          <p className="mt-2 text-sm text-slate-500">Requested by Youssef Benali | Delivery by 05 Aug 2026</p>
        </div>
        <div className="text-sm leading-6 text-slate-600">
          <p>Supplier: Atlas Education Supplies</p>
          <p>45 Boulevard Anfa</p>
          <p>Casablanca, Morocco</p>
        </div>
      </header>

      <table className="mt-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-medium">Item</th>
            <th className="pb-3 font-medium">Quantity</th>
            <th className="pb-3 font-medium">Unit Cost</th>
            <th className="pb-3 text-right font-medium">Line Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-4">Welcome kits</td>
            <td className="py-4">120</td>
            <td className="py-4">MAD 95</td>
            <td className="py-4 text-right">MAD 11,400</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4">Classroom stationery bundle</td>
            <td className="py-4">40</td>
            <td className="py-4">MAD 180</td>
            <td className="py-4 text-right">MAD 7,200</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Delivery address: H-Kids Operations Hub, 14 Avenue des Orangers, Casablanca.
        </div>
        <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Approval note: Subject to standard supplier quality confirmation and delivery receipt.
        </div>
      </div>
    </PreviewFrame>
  );
}
