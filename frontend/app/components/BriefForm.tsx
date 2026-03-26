"use client";

import { Platform } from "../types";

const PLATFORMS: Platform[] = ["Meta", "Google", "TikTok", "LinkedIn", "Display"];

interface BriefFormProps {
  client: string;
  platform: Platform;
  brief: string;
  running: boolean;
  onChange: (field: "client" | "platform" | "brief", value: string) => void;
  onSubmit: () => void;
}

export default function BriefForm({ client, platform, brief, running, onChange, onSubmit }: BriefFormProps) {
  return (
    <div className="shrink-0 border-b border-white/5 bg-[#0b0b12] px-6 py-4">
      <div className="flex gap-4 items-end">
        {/* Client */}
        <Field label="Client" width="w-[140px]">
          <input
            className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-[#7C4DFF]/60 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600"
            type="text"
            value={client}
            placeholder="e.g. FitFlow"
            onChange={(e) => onChange("client", e.target.value)}
          />
        </Field>

        {/* Platform */}
        <Field label="Platform" width="w-[130px]">
          <select
            className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-[#7C4DFF]/60 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition-colors appearance-none cursor-pointer"
            value={platform}
            onChange={(e) => onChange("platform", e.target.value)}
          >
            {PLATFORMS.map((p) => <option key={p} className="bg-[#1a1a2e]">{p}</option>)}
          </select>
        </Field>

        {/* Divider */}
        <div className="self-stretch w-px bg-white/6 mx-1 mb-0.5" />

        {/* Brief */}
        <Field label="Creative Brief" width="flex-1">
          <textarea
            className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-[#7C4DFF]/60 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 resize-none leading-relaxed"
            rows={2}
            value={brief}
            placeholder="Campaign goal, target audience, key message, tone…"
            onChange={(e) => onChange("brief", e.target.value)}
          />
        </Field>

        {/* Button */}
        <button
          onClick={onSubmit}
          disabled={running || !client.trim() || !brief.trim()}
          className="shrink-0 self-end rounded-xl py-2 px-5 text-sm font-semibold tracking-wide transition-all duration-200
            bg-[#7C4DFF] hover:bg-[#6a3de8] text-white
            disabled:opacity-35 disabled:cursor-not-allowed
            shadow-[0_0_20px_rgba(124,77,255,0.35)] hover:shadow-[0_0_28px_rgba(124,77,255,0.5)]
            disabled:shadow-none"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-white/60 animate-blink" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
              Running…
            </span>
          ) : "Generate Ad"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, width, children }: { label: string; width: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${width}`}>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-600">{label}</span>
      {children}
    </div>
  );
}
