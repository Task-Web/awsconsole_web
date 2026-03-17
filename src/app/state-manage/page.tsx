"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useCookieOverride } from "@/hooks/use-cookie-override";
import { useStateApi } from "@/hooks/use-state-api";

const defaultPayload = `{
  "meta": {
    "created_at": "2024-04-01T12:00:00+00:00",
    "updated_at": "2024-04-01T12:30:00+00:00",
    "version": 1,
    "type": "unrestricted"
  },
  "data": {
    "examples": {
      "huggingface_file": {
        "url": "https://huggingface.co/datasets/adlsdztony/osworld-v2/blob/main/email_031.tar.gz",
        "note": "Optional reference link"
      }
    },
    "uploads": []
  },
  "note": "Optional note about this state"
}`;

const dataFields = [
  {
    title: "data",
    description:
      "Object. Free-form container for experiment data and UI features.",
  },
  {
    title: "data.examples",
    description: "Object. Example references used by the UI.",
  },
  {
    title: "data.examples.huggingface_file.url",
    description:
      "String. Example dataset URL; /blob/ links are converted to /resolve/.",
  },
  {
    title: "data.examples.huggingface_file.note",
    description: "String. Human note about the example file.",
  },
  {
    title: "data.uploads",
    description:
      "Array<Upload>. Stored file metadata scoped to the current user.",
  },
  {
    title: "data.uploads[].id",
    description: "String. Unique upload id.",
  },
  {
    title: "data.uploads[].name",
    description: "String. Original file name.",
  },
  {
    title: "data.uploads[].filename",
    description: "String. Stored filename on disk (e.g. <id>__<name>).",
  },
  {
    title: "data.uploads[].type",
    description: "String. MIME type (falls back to application/octet-stream).",
  },
  {
    title: "data.uploads[].size",
    description: "Number. File size in bytes.",
  },
  {
    title: "data.uploads[].url",
    description: "String. API URL for fetching the file.",
  },
  {
    title: "data.uploads[].uploaded_at",
    description: "String. ISO 8601 timestamp (optional).",
  },
  {
    title: "data.experiment",
    description: "Object. Example experiment metadata (optional).",
  },
  {
    title: "data.experiment.step",
    description: "Number. Example step indicator (optional).",
  },
  {
    title: "data.experiment.status",
    description: "String. Example status label (optional).",
  },
];

const exampleState = `{
  "meta": {
    "created_at": "2024-04-01T12:00:00+00:00",
    "updated_at": "2024-04-01T12:30:00+00:00",
    "version": 2,
    "type": "unrestricted"
  },
  "data": {
    "experiment": { "step": 1, "status": "draft" },
    "uploads": []
  },
  "note": "Seeded default data"
}`;

export default function StateManage() {
  const { ready } = useCookieOverride();
  const {
    state,
    loading,
    error,
    userId,
    refreshState,
    replaceState,
    resetState,
    clearError,
  } = useStateApi();

  const [activeTab, setActiveTab] = useState("manage");
  const [editor, setEditor] = useState(defaultPayload);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const initializedRef = useRef(false);

  const lastUpdated = state?.state?.meta?.updated_at || "not synced yet";

  // Initialize on mount (only once)
  useEffect(() => {
    if (ready && !initializedRef.current) {
      initializedRef.current = true;
      refreshState();
    }
  }, [ready, refreshState]);

  // Sync editor with server state
  useEffect(() => {
    if (state) {
      setEditor(JSON.stringify(state.state, null, 2));
    }
  }, [state]);

  // Sync error from hook
  useEffect(() => {
    if (error) {
      setLocalError(error.message);
    }
  }, [error]);

  const parseEditor = () => {
    try {
      return JSON.parse(editor);
    } catch {
      throw new Error("Editor content is not valid JSON.");
    }
  };

  const handleSave = async () => {
    setMessage("");
    setLocalError("");
    clearError();
    try {
      const payload = parseEditor();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("State must be a JSON object.");
      }
      const hasEnvelope = Object.prototype.hasOwnProperty.call(payload, "data");
      const nextData = hasEnvelope ? payload.data : payload;
      if (!nextData || typeof nextData !== "object" || Array.isArray(nextData)) {
        throw new Error("State must include a data object.");
      }
      const hasNote = Object.prototype.hasOwnProperty.call(payload, "note");
      const nextNote = hasNote ? payload.note : undefined;
      const hasMeta = Object.prototype.hasOwnProperty.call(payload, "meta");
      const nextMeta = hasMeta ? payload.meta : undefined;
      const result = await replaceState(nextData, nextNote, nextMeta);
      if (result) {
        setEditor(JSON.stringify(result.state, null, 2));
        setMessage("State saved.");
      }
    } catch (err) {
      setLocalError((err as Error).message);
    }
  };

  const handleReset = async () => {
    setMessage("");
    setLocalError("");
    clearError();
    const result = await resetState();
    if (result) {
      setEditor(JSON.stringify(result.state, null, 2));
      setMessage("State reset.");
    }
  };

  const downloadState = () => {
    setMessage("");
    setLocalError("");
    try {
      const payload = parseEditor();
      const fileNameBase = state?.user_id ? `state-${state.user_id}` : "state";
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileNameBase}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLocalError((err as Error).message);
    }
  };

  if (!ready) {
    return null; // Redirect in progress
  }

  return (
    <div
      className="relative h-screen min-h-screen overflow-hidden text-slate-900"
      style={
        {
          "--page-bg": "#f7f6f1",
          "--paper": "rgba(255,255,255,0.88)",
          "--line": "rgba(15,23,42,0.08)",
          "--accent": "#0f766e",
          "--accent-soft": "rgba(13,148,136,0.12)",
          backgroundColor: "var(--page-bg)",
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(15,118,110,0.12), transparent 45%)," +
            "radial-gradient(circle at 85% 5%, rgba(8,145,178,0.1), transparent 40%)," +
            "linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)," +
            "linear-gradient(180deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 140px 140px, 140px 140px",
        }}
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header
          className="flex flex-col gap-6 rounded-3xl border bg-[rgba(255,255,255,0.88)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur"
          style={{ borderColor: "var(--line)" } as React.CSSProperties}
        >
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl text-slate-900 md:text-4xl">
              State console
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span
              className="rounded-full border px-3 py-1"
              style={{ borderColor: "var(--line)" } as React.CSSProperties}
            >
              User cookie: {userId}
            </span>
            <span
              className="rounded-full border px-3 py-1"
              style={{ borderColor: "var(--line)" } as React.CSSProperties}
            >
              API base: /api
            </span>
            <span
              className="rounded-full border px-3 py-1"
              style={{ borderColor: "var(--line)" } as React.CSSProperties}
            >
              Last update: {lastUpdated}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "docs", label: "State docs" },
              { id: "manage", label: "Manage state" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "text-slate-900"
                    : "text-slate-600 hover:border-slate-300"
                }`}
                style={
                  {
                    borderColor:
                      activeTab === tab.id ? "var(--accent)" : "var(--line)",
                    backgroundColor:
                      activeTab === tab.id ? "var(--accent-soft)" : "transparent",
                  } as React.CSSProperties
                }
                aria-pressed={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
            <Link
              className="rounded-full border px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
              style={{ borderColor: "var(--line)" } as React.CSSProperties}
              href="/"
            >
              Back to home
            </Link>
          </div>
        </header>

        {activeTab === "docs" ? (
          <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="grid min-h-0 flex-1 gap-4 overflow-auto lg:grid-cols-[1.2fr_0.8fr]">
              <article
                className="rounded-3xl border bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                style={{ borderColor: "var(--line)" } as React.CSSProperties}
              >
                <h2 className="font-display text-lg text-slate-900">
                  Data field reference
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Focus on the data payload. Meta and note are secondary.
                </p>
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  {dataFields.map((field) => (
                    <div
                      key={field.title}
                      className="rounded-2xl border bg-white/70 p-3"
                      style={{ borderColor: "var(--line)" } as React.CSSProperties}
                    >
                      <div className="font-mono text-xs text-slate-500">
                        {field.title}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {field.description}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article
                className="rounded-3xl border p-5 text-sm text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                style={
                  {
                    borderColor: "var(--accent)",
                    backgroundColor: "var(--accent-soft)",
                  } as React.CSSProperties
                }
              >
                <h2 className="font-display text-lg text-slate-900">
                  Full example
                </h2>
                <p className="mt-2 text-sm text-slate-700">
                  This example mirrors the full envelope returned by the backend.
                </p>
                <pre
                  className="mt-4 max-h-[360px] overflow-auto rounded-2xl border bg-white/80 p-4 font-mono text-xs text-slate-700"
                  style={{ borderColor: "var(--line)" } as React.CSSProperties}
                >
                  {exampleState}
                </pre>
                <p className="mt-4 text-sm text-slate-700">
                  Any site built on basesite must keep the /state-manage interface
                  with both the documentation and the live editor. This page is the
                  canonical place to inspect and update per-user state.
                </p>
              </article>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4">
            <article
              className="flex min-h-0 flex-1 flex-col rounded-3xl border bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
              style={{ borderColor: "var(--line)" } as React.CSSProperties}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-slate-900">
                    Edit in one JSON view
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshState()}
                    disabled={loading}
                    className="rounded-full border px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                    style={{ borderColor: "var(--line)" } as React.CSSProperties}
                  >
                    Refresh from server
                  </button>
                </div>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
                <label className="flex min-h-0 flex-1 flex-col gap-2 text-sm text-slate-600">
                  <span>Full state JSON</span>
                  <textarea
                    className="min-h-0 w-full flex-1 rounded-2xl border bg-white/80 px-4 py-3 font-mono text-xs text-slate-800 outline-none ring-1 ring-transparent transition focus:ring-emerald-400/40"
                    style={{ borderColor: "var(--line)" } as React.CSSProperties}
                    value={editor}
                    onChange={(event) => setEditor(event.target.value)}
                    spellCheck={false}
                  />
                </label>
                <div className="min-h-[24px] text-sm">
                  {localError && <p className="text-rose-500">{localError}</p>}
                  {!localError && message && <p className="text-emerald-600">{message}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                  style={{ backgroundColor: "var(--accent)" } as React.CSSProperties}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={downloadState}
                  disabled={loading}
                  className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  style={{ borderColor: "var(--line)" } as React.CSSProperties}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  style={{ borderColor: "var(--line)" } as React.CSSProperties}
                >
                  Reset state
                </button>
              </div>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
