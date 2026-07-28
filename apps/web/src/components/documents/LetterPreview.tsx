import PreviewFrame from './PreviewFrame';

export default function LetterPreview() {
  return (
    <PreviewFrame title="Administrative Letter" subtitle="Enrollment administrative confirmation">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">H-Kids Administration</p>
        <h3 className="mt-3 text-3xl font-semibold text-slate-900">Administrative Letter</h3>
        <p className="mt-2 text-sm text-slate-500">Casablanca, 28 Jul 2026</p>
      </div>

      <div className="mt-8 max-w-3xl text-sm leading-8 text-slate-700">
        <p className="font-medium text-slate-900">Mrs. Sofia El Amrani</p>
        <p>Parent and guardian</p>
        <p className="mt-6 font-medium text-slate-900">Subject: Enrollment Administrative Confirmation</p>
        <p className="mt-6">
          Dear Mrs. El Amrani,
        </p>
        <p className="mt-4">
          We are pleased to confirm that the administrative review of your child&apos;s enrollment
          file has progressed successfully. At this stage, the remaining steps include final
          document verification, schedule confirmation, and onboarding coordination with our
          operations team.
        </p>
        <p className="mt-4">
          Please keep the original identification documents available for the final verification
          appointment. Our team will share the final onboarding calendar and reception details
          shortly.
        </p>
        <p className="mt-4">
          We remain at your disposal should you require any clarification.
        </p>
        <p className="mt-8">Sincerely,</p>
        <p className="mt-4 font-medium text-slate-900">Operations Director</p>
        <p>H-Kids</p>
      </div>
    </PreviewFrame>
  );
}
