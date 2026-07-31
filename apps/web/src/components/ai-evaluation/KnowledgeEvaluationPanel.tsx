import type { KnowledgeEvaluation } from '../../types/aiEvaluation';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import { formatScore, scoreAccent, scoreTone } from '../../utils/evaluationFormat';
import { formatNumber, formatPercent, formatRelativeTime } from '../../utils/observabilityFormat';

interface KnowledgeEvaluationPanelProps {
  knowledge: KnowledgeEvaluation;
}

export default function KnowledgeEvaluationPanel({ knowledge }: KnowledgeEvaluationPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Knowledge coverage"
          value={formatPercent(knowledge.coveragePercent)}
          hint={`${knowledge.retrievedDocuments}/${knowledge.totalDocuments} documents retrieved`}
          accent={scoreAccent(knowledge.coveragePercent)}
        />
        <MetricCard
          label="Retrieval success"
          value={formatPercent(knowledge.retrievalSuccessRate)}
          hint={`${knowledge.retrievalFailures} answers without knowledge`}
          accent={scoreAccent(knowledge.retrievalSuccessRate)}
        />
        <MetricCard
          label="Document quality"
          value={`${formatScore(knowledge.averageQuality)}/100`}
          hint={`Completeness ${formatScore(knowledge.averageCompleteness)}/100`}
          accent="purple"
        />
        <MetricCard
          label="Freshness"
          value={String(knowledge.freshness.staleDocuments)}
          hint={`Documents untouched for ${knowledge.freshness.staleDays} days`}
          accent={knowledge.freshness.staleDocuments > 0 ? 'orange' : 'emerald'}
        />
      </div>

      {knowledge.knowledgeGaps.length > 0 ? (
        <Panel className="border-orange-400/20 p-5">
          <h2 className="text-lg font-semibold text-white">Knowledge gaps</h2>
          <div className="mt-4 space-y-3">
            {knowledge.knowledgeGaps.map((gap) => (
              <div key={gap.code} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                <p className="text-sm text-white">{gap.title}</p>
                <p className="mt-1 text-xs text-slate-500">{gap.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Most useful documents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ranked by the number of evaluated answers grounded in them.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Citations</th>
                  <th className="px-5 py-3 font-medium">Answer score</th>
                </tr>
              </thead>
              <tbody>
                {knowledge.mostUseful.map((document) => (
                  <tr key={document.documentId} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3">
                      <p className="text-white">{document.title}</p>
                      <p className="text-xs text-slate-500">
                        {document.collectionName || document.category || 'Uncategorised'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{formatNumber(document.citations)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={scoreTone(document.averageScore)}>
                        {formatScore(document.averageScore)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {knowledge.mostUseful.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No document has been cited by an evaluated answer yet.
            </div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Unused documents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Active documents that no agent has ever retrieved.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {knowledge.unusedDocuments.map((document) => (
                  <tr key={document.id} className="border-t border-white/6 hover:bg-white/4">
                    <td className="px-5 py-3 text-white">{document.title}</td>
                    <td className="px-5 py-3 text-slate-300">{document.category || '—'}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {formatRelativeTime(document.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {knowledge.unusedDocuments.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-emerald-300">
              Every active document has been used at least once.
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Collection health</h2>
          <p className="mt-1 text-sm text-slate-400">
            Share of each collection that agents actually ground their answers in.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Documents</th>
                <th className="px-5 py-3 font-medium">Retrievals</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Answer score</th>
              </tr>
            </thead>
            <tbody>
              {knowledge.collections.map((collection) => (
                <tr key={collection.id} className="border-t border-white/6 hover:bg-white/4">
                  <td className="px-5 py-3">
                    <p className="text-white">{collection.name}</p>
                    <p className="text-xs text-slate-500">{collection.status}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{collection.documents}</td>
                  <td className="px-5 py-3 text-slate-300">{formatNumber(collection.retrievals)}</td>
                  <td className="px-5 py-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${Math.min(collection.healthPercent, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPercent(collection.healthPercent)}
                    </p>
                  </td>
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
        {knowledge.collections.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No knowledge collection has been created yet.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
