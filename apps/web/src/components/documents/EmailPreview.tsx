import PreviewFrame from './PreviewFrame';

export default function EmailPreview() {
  return (
    <PreviewFrame title="Email" subtitle="Parent follow-up communication">
      <div className="rounded-3xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-sm text-slate-500">From: support@hkids.app</p>
          <p className="mt-2 text-sm text-slate-500">To: parent.support@familymail.com</p>
          <p className="mt-2 text-sm text-slate-500">
            Subject: Missing registration documents follow-up
          </p>
        </div>
        <div className="px-6 py-6 text-sm leading-8 text-slate-700">
          <p>Dear Parent,</p>
          <p className="mt-4">
            We hope you are doing well. This is a friendly reminder regarding the remaining
            registration documents needed to complete your administrative file for the upcoming
            term.
          </p>
          <p className="mt-4">
            At your earliest convenience, please send the signed authorization form and the updated
            copy of the student medical record. Once received, our team will finalize the enrollment
            workflow and confirm the onboarding schedule.
          </p>
          <p className="mt-4">
            If you need any assistance, simply reply to this email and we will be happy to help.
          </p>
          <p className="mt-6">Kind regards,</p>
          <p className="font-medium text-slate-900">H-Kids Administrative Team</p>
        </div>
      </div>
    </PreviewFrame>
  );
}
