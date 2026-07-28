import PreviewFrame from './PreviewFrame';

export default function DeliveryNotePreview() {
  return (
    <PreviewFrame title="Delivery Note" subtitle="Dispatch confirmation for printed materials">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Delivery Note</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">DN-2026-118</h3>
          <p className="mt-2 text-sm text-slate-500">Dispatch date: 28 Jul 2026</p>
        </div>
        <div className="text-sm leading-6 text-slate-600">
          <p>Destination: H-Kids Learning Center</p>
          <p>Receiver: Nadia Karim</p>
          <p>Carrier: Internal Operations</p>
        </div>
      </header>

      <table className="mt-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Quantity</th>
            <th className="pb-3 font-medium">Condition</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-4">Parent welcome guides</td>
            <td className="py-4">200</td>
            <td className="py-4">Packed and sealed</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-4">Student onboarding folders</td>
            <td className="py-4">120</td>
            <td className="py-4">Ready for distribution</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dispatch notes</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Items checked and packed by the operations team. Delivery window scheduled for 14:00.
          </p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Acknowledgment</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Receiver signature and timestamp to be added upon handover.
          </p>
        </div>
      </div>
    </PreviewFrame>
  );
}
