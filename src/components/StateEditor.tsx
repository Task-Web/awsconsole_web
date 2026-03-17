"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useCookieOverride } from "@/hooks/use-cookie-override";
import { useStateApi } from "@/hooks/use-state-api";

const defaultPayload = `{
  "experiment": { "step": 1, "status": "draft" },
  "inputs": { "a": 1, "b": 2 },
  "notes": "edit and send to the backend"
}`;

export default function StateEditor() {
  const { ready } = useCookieOverride();
  const {
    state,
    info,
    loading,
    error,
    userId,
    refreshState,
    refreshInfo,
    patchState,
    replaceState,
    resetState,
    uploadFiles,
    clearError,
  } = useStateApi();

  const [editor, setEditor] = useState(defaultPayload);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const initializedRef = useRef(false);

  // Initialize on mount (only once)
  useEffect(() => {
    if (ready && !initializedRef.current) {
      initializedRef.current = true;
      refreshState();
      refreshInfo();
    }
  }, [ready, refreshState, refreshInfo]);

  // Sync note from server state
  useEffect(() => {
    if (state?.state.note) {
      setNote(state.state.note);
    }
  }, [state?.state.note]);

  // Clear message when error changes
  useEffect(() => {
    if (error) {
      setMessage(error.message);
    }
  }, [error]);

  const parseEditor = () => {
    try {
      return JSON.parse(editor);
    } catch {
      throw new Error("Editor content is not valid JSON.");
    }
  };

  const runReplace = async () => {
    setMessage("");
    clearError();
    try {
      const payload = parseEditor();
      const result = await replaceState(payload, note || undefined);
      if (result) {
        setMessage("State replaced.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const runPatch = async () => {
    setMessage("");
    clearError();
    try {
      const payload = parseEditor();
      const result = await patchState(payload, note || undefined);
      if (result) {
        setMessage("State patched.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const runReset = async () => {
    setMessage("");
    clearError();
    const result = await resetState();
    if (result) {
      setNote("");
      setEditor(defaultPayload);
      setMessage("State reset.");
    }
  };

  const runUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Select a file to upload.");
      return;
    }
    setUploadStatus("");
    const uploads = state?.state.data.uploads ?? [];
    const uploaded = await uploadFiles([selectedFile]);
    if (uploaded) {
      const stampedUploads = uploaded.map((file) => ({
        ...file,
        uploaded_at: new Date().toISOString(),
      }));
      const nextUploads = [...uploads, ...stampedUploads];
      await patchState({ uploads: nextUploads });
      await refreshState();
      setSelectedFile(null);
      setUploadStatus("File uploaded to server storage.");
    }
  };

  const runDeleteFile = async (index: number) => {
    const uploads = state?.state.data.uploads ?? [];
    const nextUploads = uploads.filter((_, idx) => idx !== index);
    await patchState({ uploads: nextUploads });
    await refreshState();
  };

  const buildHfDownloadUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.includes("/blob/")) {
      return url.replace("/blob/", "/resolve/");
    }
    return url;
  };

  const resolveFileUrl = (url: string | undefined) => {
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith("/")) {
      return url;
    }
    return `/${url}`;
  };

  const triggerDownload = (url: string, filename?: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.rel = "noopener";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadExample = () => {
    const exampleUrl = state?.state.data.examples?.huggingface_file?.url;
    const downloadUrl = buildHfDownloadUrl(exampleUrl);
    if (downloadUrl) {
      triggerDownload(downloadUrl, "email_031.tar.gz");
    }
  };

  const [mcpUrl, setMcpUrl] = useState("/mcp");

  useEffect(() => {
    setMcpUrl(`${window.location.origin}/mcp`);
  }, []);

  const mcpConfig = JSON.stringify(
    {
      name: "basesite-mcp",
      transport: "streamable_http",
      url: mcpUrl,
    },
    null,
    2
  );

  const prettyState = state
    ? JSON.stringify(state.state, null, 2)
    : "// no state yet";
  const infoText = info ? JSON.stringify(info, null, 2) : "// loading info";

  const uploads = state?.state.data.uploads ?? [];
  const examples = state?.state.data.examples;

  if (!ready) {
    return null; // Redirect in progress
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 pb-12 pt-10">
      <header className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Base Experiment Surface
          </p>
          <h1 className="font-display text-3xl text-white md:text-4xl">
            Per-user state playground
          </h1>
          <p className="max-w-2xl text-slate-300">
            Cookie-based identity, explicit state controls, and system
            visibility for experiments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
            User cookie: {userId}
          </span>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
            API base: /api
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5"
            onClick={refreshState}
            disabled={loading}
          >
            Refresh state
          </button>
          <button
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:-translate-y-0.5"
            onClick={refreshInfo}
            disabled={loading}
          >
            Refresh info
          </button>
          <button
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:-translate-y-0.5"
            onClick={downloadExample}
            disabled={loading || !examples?.huggingface_file?.url}
          >
            Download HF example
          </button>
          <Link
            href="/state-manage"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/40 transition hover:-translate-y-0.5"
          >
            State Manager
          </Link>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="lg:col-span-1 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                State editor
              </p>
              <h3 className="font-display text-xl text-white">
                Compose payload
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-emerald-300/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                onClick={runPatch}
                disabled={loading}
              >
                PATCH merge
              </button>
              <button
                className="rounded-xl bg-blue-300/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                onClick={runReplace}
                disabled={loading}
              >
                PUT replace
              </button>
              <button
                className="rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                onClick={runReset}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Note (optional)</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 font-mono text-sm text-white outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Short note describing this state"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>JSON payload</span>
              <textarea
                className="min-h-[240px] w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm text-white outline-none ring-1 ring-transparent transition focus:ring-cyan-400/60"
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
                spellCheck={false}
              />
            </label>
            {message && (
              <p className="text-sm text-emerald-200">{message}</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Current state
              </p>
              <h3 className="font-display text-xl text-white">Server view</h3>
            </div>
            <button
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
              onClick={refreshState}
              disabled={loading}
            >
              Pull latest
            </button>
          </div>
          <pre className="mt-4 min-h-[240px] overflow-auto rounded-xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs text-slate-200">
            {prettyState}
          </pre>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Uploads
              </p>
              <h3 className="font-display text-xl text-white">Stored files</h3>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-1 file:text-sm file:text-white"
              type="file"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
            <button
              className="rounded-xl bg-amber-300/90 px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={runUpload}
              disabled={loading}
            >
              Upload
            </button>
          </div>
          {uploadStatus && (
            <p className="mt-2 text-sm text-emerald-200">{uploadStatus}</p>
          )}
          <div className="mt-4 grid gap-2">
            {uploads.length === 0 ? (
              <p className="text-sm text-slate-400">
                No uploaded files for this user.
              </p>
            ) : (
              uploads.map((file, index) => {
                const displayName = file.name || file.filename || "file";
                const contentType =
                  file.type || "application/octet-stream";
                const downloadUrl = resolveFileUrl(file.url);
                return (
                  <div
                    key={`${file.id || file.filename || displayName}-${file.uploaded_at || index}`}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {displayName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {contentType} • {file.size} bytes
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                        onClick={() =>
                          triggerDownload(downloadUrl, displayName)
                        }
                        disabled={loading || !downloadUrl}
                      >
                        Download
                      </button>
                      <button
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => runDeleteFile(index)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Backend info
              </p>
              <h3 className="font-display text-xl text-white">
                System + request
              </h3>
            </div>
            <button
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
              onClick={refreshInfo}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <pre className="mt-4 min-h-[220px] overflow-auto rounded-xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs text-slate-200">
            {infoText}
          </pre>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                MCP
              </p>
              <h3 className="font-display text-xl text-white">
                Streamable HTTP config
              </h3>
            </div>
          </div>
          <pre className="mt-4 overflow-auto rounded-xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs text-slate-200">
            {mcpConfig}
          </pre>
        </section>
      </main>
    </div>
  );
}
