"use client";

import { useRef } from "react";
import { Platform } from "../types";

const PLATFORMS: Platform[] = ["Meta", "Google", "TikTok", "LinkedIn", "Display"];

interface BriefFormProps {
  client: string;
  platform: Platform;
  brief: string;
  running: boolean;
  bibleFilename?: string;
  uploadingBible?: boolean;
  onChange: (field: "client" | "platform" | "brief", value: string) => void;
  onSubmit: () => void;
  onBibleUpload: (file: File) => void;
}

export default function BriefForm({ client, platform, brief, running, bibleFilename, uploadingBible, onChange, onSubmit, onBibleUpload }: BriefFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

        {/* Divider */}
        <div className="self-stretch w-px bg-white/6 mx-1 mb-0.5" />

        {/* Brand Bible Upload */}
        <Field label="Brand Bible" width="w-[148px]">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onBibleUpload(f); }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingBible || running}
            className="w-full h-15.5 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-all duration-200 text-center
              border-white/12 hover:border-[#7C4DFF]/50 hover:bg-[#7C4DFF]/5
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploadingBible ? (
              <span className="text-[10px] text-slate-500">Uploading…</span>
            ) : bibleFilename ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                <span className="text-[10px] text-slate-400 leading-tight px-2 truncate w-full text-center">{bibleFilename}</span>
                <span className="text-[9px] text-slate-600">click to replace</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-[10px] text-slate-600">PDF or TXT</span>
              </>
            )}
          </button>
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
