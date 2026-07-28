import { useState } from 'react';
import type { RetrievalSearchResponse } from '../../types/retrieval';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

interface RetrievalDebugPanelProps {
  initialQuestion: string;
  result: RetrievalSearchResponse | null;
  onSearch: (question: string) => Promise<void>;
}

export default function RetrievalDebugPanel({
  initialQuestion,
  result,
  onSearch,
}: RetrievalDebugPanelProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [expandedChunkIds, setExpandedChunkIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const toggleExpandedChunk = (chunkId: string) => {
    setExpandedChunkIds((currentIds) =>
      currentIds.includes(chunkId)
        ? currentIds.filter((currentId) => currentId !== chunkId)
        : [...currentIds, chunkId]
    );
  };

  const handleSearch = async () => {
    if (!question.trim()) {
      return;
    }

    setRunning(true);

    try {
      await onSearch(question);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Retrieval Debug Panel
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Inspect the RAG foundation pipeline
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Run hybrid semantic retrieval, inspect ranked chunks, and verify the final merged
            context before any provider call happens.
          </p>
        </div>
        <div className="flex w-full gap-3 xl:max-w-xl">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            placeholder="Ask a question to test retrieval..."
          />
          <Button onClick={() => void handleSearch()}>{running ? 'Searching...' : 'Run Retrieval'}</Button>
        </div>
      </div>

      {result ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Retrieved Documents
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {result.documentNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Retrieval Summary
              </h3>
              <div className="mt-4 grid gap-3">
                <Metric label="Chunks" value={String(result.retrievedChunks.length)} />
                <Metric label="Estimated Tokens" value={String(result.estimatedTokens)} />
                <Metric label="Strategy" value={result.retrievalStrategy} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Final Context
              </h3>
              <pre className="custom-scrollbar mt-4 max-h-[320px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {result.assembledContext}
              </pre>
            </section>
          </div>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Retrieved Chunks
            </h3>
            <div className="mt-4 space-y-3">
              {result.retrievedChunks.map((chunk) => {
                const expanded = expandedChunkIds.includes(chunk.id);

                return (
                  <div key={chunk.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{chunk.documentName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          Chunk {chunk.chunkNumber} | Final {chunk.finalScore.toFixed(3)} |
                          Semantic {chunk.semanticScore.toFixed(3)} | Keyword{' '}
                          {chunk.keywordScore.toFixed(3)} | Cosine{' '}
                          {chunk.cosineSimilarity.toFixed(3)} | Tokens {chunk.estimatedTokens}
                        </p>
                      </div>
                      <Button variant="ghost" className="px-3 py-2" onClick={() => toggleExpandedChunk(chunk.id)}>
                        {expanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                    {expanded ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Metric label="Semantic Score" value={chunk.semanticScore.toFixed(3)} />
                          <Metric label="Keyword Score" value={chunk.keywordScore.toFixed(3)} />
                          <Metric label="Final Score" value={chunk.finalScore.toFixed(3)} />
                          <Metric label="Cosine Similarity" value={chunk.cosineSimilarity.toFixed(3)} />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
                          <HighlightedText text={chunk.content} query={question} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </Panel>
  );
}

interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  if (tokens.length === 0) {
    return <span>{text}</span>;
  }

  const pattern = new RegExp(`(${tokens.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, index) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={`${part}-${index}`} className="rounded bg-cyan-400/20 px-1 text-cyan-200">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </span>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
