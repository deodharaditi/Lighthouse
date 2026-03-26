"use client";

import { useState } from "react";
import { AttemptState } from "../types";

const HEADLINE_LIMITS: Record<string, number> = {
  Meta: 40, Google: 30, TikTok: 100, LinkedIn: 150, Display: 25,
};

interface AgentCardProps {
  type: "generator" | "critic";
  attempt: AttemptState;
  platform?: string;
  prevAd?: string;
}

type Status = "idle" | "thinking" | "done" | "pass" | "fail";

const PILL: Record<Status, { label: string; cls: string }> = {
  idle:     { label: "Waiting",   cls: "bg-white/5 text-slate-600" },
  thinking: { label: "Thinking",  cls: "bg-[#7C4DFF]/20 text-[#b39dff] animate-blink" },
  done:     { label: "Done",      cls: "bg-slate-700/50 text-slate-400" },
  pass:     { label: "Pass ✓",    cls: "bg-[#00E676]/15 text-[#00E676]" },
  fail:     { label: "Fail ✗",    cls: "bg-[#FF5252]/15 text-[#FF5252]" },
};

function getBorder(status: Status, isGenerator: boolean): string {
  if (status === "thinking") return isGenerator
    ? "border-[#7C4DFF]/60 animate-pulse-violet"
    : "border-amber-500/50 animate-pulse-amber";
  if (status === "pass") return "border-[#00E676]/35 shadow-[0_0_30px_-5px_rgba(0,230,118,0.2)]";
  if (status === "fail") return "border-[#FF5252]/35 shadow-[0_0_30px_-5px_rgba(255,82,82,0.2)]";
  if (status === "done") return "border-white/8";
  return "border-white/5";
}

function parseAd(raw: string) {
  const headline = raw.match(/^Headline:\s*(.+)/m)?.[1]?.trim() ?? "";
  const body = raw.match(/^Body:\s*([\s\S]+?)(?=\nCTA:|$)/m)?.[1]?.trim() ?? "";
  const cta = raw.match(/^CTA:\s*(.+)/m)?.[1]?.trim() ?? "";
  const isParsed = headline || body || cta;
  return isParsed ? { headline, body, cta } : null;
}

export default function AgentCard({ type, attempt, platform, prevAd }: AgentCardProps) {
  const isGenerator = type === "generator";
  const status = (isGenerator ? attempt.generatorStatus : attempt.criticStatus) as Status;
  const pill = PILL[status];
  const border = getBorder(status, isGenerator);
  const latency = isGenerator ? attempt.generatorLatency : attempt.criticLatency;

  return (
    <div className={`rounded-2xl border bg-[#0f0f16]/80 backdrop-blur-sm p-5 transition-all duration-500 ${border}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isGenerator ? "bg-[#7C4DFF]/15" : "bg-amber-500/15"}`}>
          {isGenerator ? "✍️" : "🛡️"}
        </div>
        <div>
          <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isGenerator ? "text-[#9c71ff]" : "text-amber-400"}`}>
            {isGenerator ? "Generator" : "Critic"}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {isGenerator ? "Ad Copywriter" : "Brand Sentinel"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {latency !== undefined && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/4 text-slate-500 border border-white/6 tabular-nums">
              {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`}
            </span>
          )}
          <span className={`text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full ${pill.cls}`}>
            {pill.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mb-4" />

      {/* Body */}
      <div className="min-h-20">
        {isGenerator
          ? <GeneratorBody status={status} ad={attempt.ad} prevAd={prevAd} platform={platform} />
          : <CriticBody status={status} violations={attempt.violations} suggestions={attempt.suggestions} reasoning={attempt.reasoning} />
        }
      </div>
    </div>
  );
}

// ── Word-level diff ──────────────────────────────────────────────────────────

type DiffToken = { word: string; type: "same" | "added" | "removed" };

function wordDiff(oldText: string, newText: string): DiffToken[] {
  const a = oldText.split(" ");
  const b = newText.split(" ");
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const tokens: DiffToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { tokens.unshift({ word: a[i-1], type: "same" }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { tokens.unshift({ word: b[j-1], type: "added" }); j--; }
    else { tokens.unshift({ word: a[i-1], type: "removed" }); i--; }
  }
  return tokens;
}

function DiffText({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <>
      {wordDiff(oldText, newText).map((t, i) => {
        if (t.type === "added")   return <span key={i} className="bg-emerald-500/20 text-emerald-300 rounded px-0.5">{t.word} </span>;
        if (t.type === "removed") return <span key={i} className="bg-red-500/15 text-red-400/60 line-through rounded px-0.5">{t.word} </span>;
        return <span key={i}>{t.word} </span>;
      })}
    </>
  );
}

// ── Generator body ────────────────────────────────────────────────────────────

function GeneratorBody({ status, ad, prevAd, platform }: { status: Status; ad: string; prevAd?: string; platform?: string }) {
  if (status === "idle") return <p className="text-slate-600 text-sm">Waiting to start…</p>;
  if (status === "thinking") return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span className="inline-flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C4DFF]/70 animate-blink" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </span>
      Writing copy…
    </div>
  );

  const parsed = parseAd(ad);
  if (!parsed) return <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ad}</p>;

  const prev = prevAd ? parseAd(prevAd) : null;
  const limit = platform ? HEADLINE_LIMITS[platform] : undefined;
  const headlineLen = parsed.headline.length;
  const overLimit = limit !== undefined && headlineLen > limit;
  const nearLimit = limit !== undefined && !overLimit && headlineLen > limit * 0.85;

  return (
    <div className="space-y-3">
      {parsed.headline && (
        <div className="fade-in" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600">Headline</p>
            {limit !== undefined && (
              <span className={`text-[9px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                overLimit ? "bg-red-500/15 text-red-400" : nearLimit ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                {headlineLen}/{limit}
              </span>
            )}
          </div>
          <p className="text-white font-semibold text-[15px] leading-snug">
            {prev?.headline && prev.headline !== parsed.headline
              ? <DiffText oldText={prev.headline} newText={parsed.headline} />
              : parsed.headline}
          </p>
        </div>
      )}
      {parsed.body && (
        <div className="fade-in" style={{ animationDelay: "80ms" }}>
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-1">Body</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            {prev?.body && prev.body !== parsed.body
              ? <DiffText oldText={prev.body} newText={parsed.body} />
              : parsed.body}
          </p>
        </div>
      )}
      {parsed.cta && (
        <div className="fade-in inline-flex items-center gap-1.5 bg-[#7C4DFF]/15 border border-[#7C4DFF]/25 rounded-lg px-3 py-1.5 mt-1" style={{ animationDelay: "160ms" }}>
          <span className="text-[9px] font-bold tracking-widest uppercase text-[#9c71ff]">CTA</span>
          <span className="text-[#b39dff] text-sm font-medium">
            {prev?.cta && prev.cta !== parsed.cta
              ? <DiffText oldText={prev.cta} newText={parsed.cta} />
              : parsed.cta}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Critic body ───────────────────────────────────────────────────────────────

function CriticBody({ status, violations, suggestions, reasoning }: {
  status: Status; violations: string[]; suggestions: string[]; reasoning: string[];
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (status === "idle") return <p className="text-slate-600 text-sm">Waiting for generator…</p>;
  if (status === "thinking") return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span className="inline-flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-blink" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </span>
      Checking compliance…
    </div>
  );
  if (status === "pass") return (
    <div className="flex items-center gap-2.5 text-[#00E676]">
      <div className="w-7 h-7 rounded-full bg-[#00E676]/15 flex items-center justify-center text-sm shrink-0">✓</div>
      <p className="text-sm font-medium">No violations found. Fully brand compliant.</p>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {violations.map((v, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <div className="bg-red-500/8 border border-red-500/20 px-3.5 py-2.5">
            <p className="text-[9px] font-bold tracking-widest uppercase text-red-500/70 mb-1">Violation</p>
            <p className="text-red-300 text-[12px] leading-relaxed">{v}</p>
          </div>
          {suggestions[i] && (
            <div className="bg-amber-500/6 border border-t-0 border-amber-500/15 px-3.5 py-2.5">
              <p className="text-[9px] font-bold tracking-widest uppercase text-amber-500/60 mb-1">Fix</p>
              <p className="text-amber-300/80 text-[12px] leading-relaxed">{suggestions[i]}</p>
            </div>
          )}
          {reasoning[i] && (
            <>
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full bg-white/2 border border-t-0 border-white/6 hover:bg-white/4 px-3.5 py-1.5 text-left transition-colors"
              >
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600 flex items-center gap-1.5">
                  <span>{expandedIdx === i ? "▴" : "▾"}</span>
                  View Brand Rule
                </span>
              </button>
              {expandedIdx === i && (
                <div className="bg-[#0b0b12] border border-t-0 border-white/6 px-3.5 py-3 fade-in">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600 mb-1.5">Why this violates brand policy</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{reasoning[i]}</p>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
