"use client";

import { useState, useRef } from "react";
import BriefForm from "./components/BriefForm";
import AgentCard from "./components/AgentCard";
import { AttemptState, PipelineEvent, PipelineResult, Platform } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [client, setClient] = useState("FitFlow");
  const [platform, setPlatform] = useState<Platform>("Meta");
  const [brief, setBrief] = useState("");
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState<AttemptState[]>([]);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [bibleFileId, setBibleFileId] = useState<string | null>(null);
  const [bibleFilename, setBibleFilename] = useState<string | undefined>();
  const [uploadingBible, setUploadingBible] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const timingRef = useRef<Record<number, { genStart?: number; criticStart?: number }>>({});

  function scroll() {
    setTimeout(() => canvasRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  }

  function handleChange(field: "client" | "platform" | "brief", value: string) {
    if (field === "client") setClient(value);
    else if (field === "platform") setPlatform(value as Platform);
    else setBrief(value);
  }

  function updateAttempt(n: number, patch: Partial<AttemptState>) {
    setAttempts((prev) => prev.map((a) => (a.attempt === n ? { ...a, ...patch } : a)));
  }

  async function handleBibleUpload(file: File) {
    setUploadingBible(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/upload-bible`, { method: "POST", body: form });
      const data = await res.json();
      setBibleFileId(data.file_id);
      setBibleFilename(data.filename);
    } finally {
      setUploadingBible(false);
    }
  }

  async function handleSubmit() {
    setRunning(true);
    setAttempts([]);
    setResult(null);
    timingRef.current = {};

    const params = new URLSearchParams({ brief, client_name: client, platform });
    if (bibleFileId) params.set("bible_file_id", bibleFileId);
    const es = new EventSource(`${API_URL}/run?${params}`);

    es.onmessage = (e: MessageEvent) => {
      const data: PipelineEvent = JSON.parse(e.data);

      if (data.event === "generator_start") {
        timingRef.current[data.attempt] = { genStart: Date.now() };
        setAttempts((prev) => [
          ...prev,
          {
            attempt: data.attempt,
            generatorStatus: "thinking",
            ad: "",
            criticStatus: "idle",
            violations: [],
            suggestions: [],
            reasoning: [],
          },
        ]);
        scroll();
      }

      if (data.event === "generator_done") {
        const t = timingRef.current[data.attempt] ?? {};
        const generatorLatency = t.genStart ? Date.now() - t.genStart : undefined;
        timingRef.current[data.attempt] = { ...t, criticStart: Date.now() };
        updateAttempt(data.attempt, { generatorStatus: "done", ad: data.ad, criticStatus: "thinking", generatorLatency });
        scroll();
      }

      if (data.event === "critic_done") {
        const t = timingRef.current[data.attempt] ?? {};
        const criticLatency = t.criticStart ? Date.now() - t.criticStart : undefined;
        updateAttempt(data.attempt, {
          criticStatus: data.status === "PASS" ? "pass" : "fail",
          violations: data.violations,
          suggestions: data.suggestions,
          criticLatency,
          reasoning: data.reasoning,
        });
        scroll();
      }

      if (data.event === "pipeline_done") {
        setResult({ outcome: data.outcome, attempts: data.attempts, final_ad: data.final_ad });
        scroll();
        es.close();
        setRunning(false);
      }

      if (data.event === "error") {
        console.error("Pipeline error:", data.message);
        es.close();
        setRunning(false);
      }
    };

    es.onerror = () => { es.close(); setRunning(false); };
  }

  const hasRun = attempts.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#09090e]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 h-14 border-b border-white/5 shrink-0 bg-[#0b0b12]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#7C4DFF]/20 flex items-center justify-center text-sm">🏗</div>
          <span className="text-[14px] font-bold tracking-[0.18em] text-white">
            LIGHT<span className="text-[#9c71ff]">HOUSE</span>
          </span>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-slate-600">
          Multi-Agent Creative Guardrail
        </span>
      </header>

      <BriefForm
        client={client}
        platform={platform}
        brief={brief}
        running={running}
        bibleFilename={bibleFilename}
        uploadingBible={uploadingBible}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onBibleUpload={handleBibleUpload}
      />

      {/* Canvas */}
      <main ref={canvasRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 flex flex-col gap-8">
          {!hasRun && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center">
                <svg className="text-slate-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 font-semibold text-sm mb-1">Ready when you are</p>
                <p className="text-slate-600 text-xs max-w-[260px] leading-relaxed">
                  Fill in the brief and hit Generate Ad to watch the two agents collaborate in real time.
                </p>
              </div>
            </div>
          )}

          {attempts.map((attempt, idx) => (
            <div key={attempt.attempt}>
              {idx > 0 && (
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 bg-[#0f0f16] border border-white/6 px-3 py-1 rounded-full">
                    Retry {attempt.attempt}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )}

              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-4">
                Attempt {attempt.attempt}
              </p>

              {/* Agent flow */}
              <div className="grid items-start" style={{ gridTemplateColumns: "1fr 56px 1fr" }}>
                <AgentCard type="generator" attempt={attempt} platform={platform} prevAd={idx > 0 ? attempts[idx - 1].ad : undefined} />

                {/* Connector */}
                <div className="flex flex-col items-center justify-start pt-11 gap-1">
                  <div className={`w-px h-4 rounded-full transition-all duration-500 ${attempt.criticStatus !== "idle" ? "bg-[#7C4DFF]" : "bg-white/8"}`} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    attempt.criticStatus !== "idle"
                      ? "border-[#7C4DFF] bg-[#7C4DFF]/15 shadow-[0_0_10px_rgba(124,77,255,0.4)]"
                      : "border-white/10 bg-transparent"
                  }`}>
                    <span className={`text-[10px] font-bold transition-colors duration-500 ${attempt.criticStatus !== "idle" ? "text-[#9c71ff]" : "text-white/15"}`}>›</span>
                  </div>
                  <div className={`w-px h-4 rounded-full transition-all duration-500 ${attempt.criticStatus !== "idle" ? "bg-[#7C4DFF]" : "bg-white/8"}`} />
                </div>

                <AgentCard type="critic" attempt={attempt} platform={platform} />
              </div>
            </div>
          ))}

          {/* Final result */}
          {result && (
            <div className={`rounded-2xl border p-7 ${
              result.outcome === "APPROVED"
                ? "border-[#00E676]/30 bg-gradient-to-br from-[#00E676]/5 via-transparent to-[#7C4DFF]/5 shadow-[0_8px_40px_-12px_rgba(0,230,118,0.15)]"
                : "border-[#FF5252]/30 bg-gradient-to-br from-[#FF5252]/5 via-transparent to-amber-500/5 shadow-[0_8px_40px_-12px_rgba(255,82,82,0.12)]"
            }`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${result.outcome === "APPROVED" ? "bg-[#00E676]/15" : "bg-[#FF5252]/15"}`}>
                  {result.outcome === "APPROVED" ? "✓" : "⚠"}
                </div>
                <div>
                  <p className={`text-[11px] font-bold tracking-[0.15em] uppercase ${result.outcome === "APPROVED" ? "text-[#00E676]" : "text-[#FF5252]"}`}>
                    {result.outcome === "APPROVED" ? "Approved" : "Escalated to Human Review"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {result.attempts} attempt{result.attempts > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="h-px bg-white/5 mb-5" />
              <p className="text-[14px] leading-[1.9] text-slate-200 whitespace-pre-wrap">{result.final_ad}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
