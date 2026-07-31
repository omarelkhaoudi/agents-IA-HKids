import type { EvaluationOverview } from '../../types/aiEvaluation';
import TrendChart from '../observability/TrendChart';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatBucketLabel,
  formatCriterion,
  formatScore,
  riskTone,
  scoreAccent,
  scoreTone,
} from '../../utils/evaluationFormat';
import { formatCost, formatDuration, formatNumber, formatPercent } from '../../utils/observabilityFormat';

interface QualityOverviewPanelProps {
  overview: EvaluationOverview;
}

export default function QualityOverviewPanel({ overview }: QualityOverviewPanelProps) {
  const { summary } = overview;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overall AI quality"
          value={`${formatScore(summary.averageScore)}/100`}
          hint={`${formatNumber(summary.totalRuns)} evaluated generations`}
          accent={scoreAccent(summary.averageScore)}
        />
        <MetricCard
          label="Groundedness"
          value={`${formatScore(summary.averageGroundedness)}/100`}
          hint="Share of answers supported by knowledge"
          accent={scoreAccent(summary.averageGroundedness)}
        />
        <MetricCard
          label="Hallucination risk"
          value={formatPercent(summary.averageHallucinationRisk)}
          hint="Lower is better"
          accent={summary.averageHallucinationRisk > 45 ? 'orange' : 'emerald'}
        />
        <MetricCard
          label="Knowledge coverage"
          value={formatPercent(summary.averageKnowledgeCoverage)}
          hint="Retrieved context actually used"
          accent={scoreAccent(summary.averageKnowledgeCoverage)}
        />
        <MetricCard
          label="Approval rate"
          value={formatPercent(summary.approvalRate)}
          hint={`${summary.approved} approved / ${summary.rejected} rejected`}
          accent={scoreAccent(summary.approvalRate)}
        />
        <MetricCard
          label="Average feedback"
          value={`${formatScore(summary.averageFeedback)}/100`}
          hint="Human ratings converted to a score"
          accent="purple"
        />
        <MetricCard
          label="Prompt effectiveness"
          value={`${formatScore(overview.promptEffectiveness)}/100`}
          hint="Mean quality across evaluated prompts"
          accent={scoreAccent(overview.promptEffectiveness)}
        />
        <MetricCard
          label="Average response time"
          value={formatDuration(summary.averageLatencyMs)}
          hint={`${formatNumber(summary.averageTokens)} tokens, ${formatCost(summary.averageCost)} per answer`}
          accent="blue"
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Quality evolution</h2>
            <p className="mt-1 text-sm text-slate-400">
              Average score per day over the last {overview.windowDays} days.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={scoreTone(summary.passRate)}>{formatPercent(summary.passRate)} pass</Badge>
            <Badge tone={summary.failed > 0 ? 'warning' : 'success'}>{summary.failed} failed</Badge>
            <Badge tone="neutral">{formatCost(summary.totalCost)} total cost</Badge>
          </div>
        </div>

        <div className="mt-6">
          <TrendChart
            points={overview.trend.map((bucket) => ({
              label: formatBucketLabel(bucket.bucket),
              value: bucket.averageScore,
              secondaryValue: bucket.failureRate,
              hint: `${bucket.bucket}: ${formatScore(bucket.averageScore)}/100 over ${bucket.runs} runs`,
            }))}
            accent="emerald"
            maxValue={100}
            primaryLabel="Quality score"
            secondaryLabel="Failure rate"
            emptyLabel="No evaluation has been recorded for this period."
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Score per criterion</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every generation is scored against twelve criteria by the evaluation engine.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.criteria.map((criterion) => (
            <div
              key={criterion.criterion}
              className="rounded-xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white">{formatCriterion(criterion.criterion)}</p>
                <Badge tone={scoreTone(criterion.averageScore)}>
                  {formatScore(criterion.averageScore)}
                </Badge>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.min(criterion.averageScore, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {criterion.samples} samples · {criterion.failures} below threshold
              </p>
            </div>
          ))}
        </div>

        {overview.criteria.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">
            No criterion has been scored yet. Evaluations are captured automatically on every AI
            generation.
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Quality per knowledge collection</h2>
            <p className="mt-1 text-sm text-slate-400">
              Collections owned by the Knowledge Platform, scored by the answers that cited them.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Collection</th>
                  <th className="px-5 py-3 font-medium">Documents</th>
                  <th className="px-5 py-3 font-medium">Citations</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {overview.knowledgeCollections.map((collection) => (
                  <tr key={collection.id} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{collection.name}</p>
                      <p className="text-xs text-slate-500">{collection.status}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {collection.citedDocuments}/{collection.documents}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{collection.citations}</td>
                    <td className="px-5 py-3">
                      <Badge tone={scoreTone(collection.averageScore)}>
                        {formatScore(collection.averageScore)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overview.knowledgeCollections.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No knowledge collection has been created yet.
            </div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Quality per document</h2>
            <p className="mt-1 text-sm text-slate-400">
              Documents ranked by how often agents grounded an answer in them.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Citations</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Groundedness</th>
                </tr>
              </thead>
              <tbody>
                {overview.knowledgeDocuments.slice(0, 10).map((document) => (
                  <tr key={document.documentId} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{document.title}</p>
                      <p className="text-xs text-slate-500">
                        {document.collectionName || document.category || 'Uncategorised'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{document.citations}</td>
                    <td className="px-5 py-3">
                      <Badge tone={scoreTone(document.averageScore)}>
                        {formatScore(document.averageScore)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={riskTone(100 - document.averageGroundedness)}>
                        {formatScore(document.averageGroundedness)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overview.knowledgeDocuments.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No document has been cited by an evaluated answer yet.
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
