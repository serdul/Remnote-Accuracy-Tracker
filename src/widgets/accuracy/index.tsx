import React, { useEffect, useMemo, useState } from "react";

type Attempt = { correct: boolean; ts: number };
type RemData = { attempts: Attempt[] };
type DB = { [remId: string]: RemData };

// Storage adapter: prefer RemNote plugin storage if available, fall back to localStorage
const storageKey = "remnote-accuracy-tracker:v1";

const getPluginStorage = (): any | null => {
  // runtime detection: many RemNote plugin runtimes expose a `plugin` object with `storage` APIs.
  // If available, use it; otherwise fall back to localStorage.
  // We access via (window as any).plugin to avoid TypeScript errors at build-time.
  const w = window as any;
  if (w.plugin && w.plugin.storage && typeof w.plugin.storage.get === "function") {
    return w.plugin.storage;
  }
  return null;
};

const storageAdapter = {
  async get(): Promise<DB> {
    const p = getPluginStorage();
    if (p) {
      try {
        const val = await p.get(storageKey);
        return val || {};
      } catch (e) {
        console.warn("plugin.storage.get failed, falling back to localStorage", e);
      }
    }
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  },
  async set(db: DB): Promise<void> {
    const p = getPluginStorage();
    if (p) {
      try {
        await p.set(storageKey, db);
        return;
      } catch (e) {
        console.warn("plugin.storage.set failed, falling back to localStorage", e);
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(db));
  },
};

function computeAccuracy(attempts: Attempt[]): number {
  if (!attempts || attempts.length === 0) return 0;
  const correct = attempts.filter((a) => a.correct).length;
  return Math.round((correct / attempts.length) * 100);
}

function useDB() {
  const [db, setDb] = useState<DB>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await storageAdapter.get();
      if (mounted) setDb(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async (next: DB) => {
    setDb(next);
    await storageAdapter.set(next);
  };

  return { db, setDb: save };
}

export default function AccuracyWidget(): JSX.Element {
  const { db, setDb } = useDB();
  const [currentRem, setCurrentRem] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("remId") || params.get("rem") || "";
    } catch (e) {
      return "";
    }
  });
  const [importError, setImportError] = useState<string | null>(null);

  const overall = useMemo(() => {
    const allAttempts: Attempt[] = Object.values(db).flatMap((r) => r.attempts || []);
    return computeAccuracy(allAttempts);
  }, [db]);

  const currentAttempts = db[currentRem]?.attempts || [];
  const currentAccuracy = computeAccuracy(currentAttempts);

  const record = async (correct: boolean) => {
    if (!currentRem) {
      alert("Set a Rem ID first (enter its ID in the input).
If running inside RemNote the plugin runtime may provide remId via query params.");
      return;
    }
    const next: DB = { ...db };
    if (!next[currentRem]) next[currentRem] = { attempts: [] };
    next[currentRem].attempts = [...next[currentRem].attempts, { correct, ts: Date.now() }];
    await setDb(next);
  };

  const resetRem = async (remId?: string) => {
    const r = remId ?? currentRem;
    if (!r) return;
    const next = { ...db };
    delete next[r];
    await setDb(next);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remnote-accuracy.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file: File | null) => {
    setImportError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as DB;
        // simple merge: overwrite per-rem with imported data
        const next = { ...db, ...parsed } as DB;
        await setDb(next);
      } catch (err: any) {
        setImportError(err?.message || String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', padding: 12, maxWidth: 420 }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>RemNote Accuracy Tracker</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>Rem ID</label>
        <input value={currentRem} onChange={(e) => setCurrentRem(e.target.value)} style={{ flex: 1 }} placeholder="enter rem id or use remId query param" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={{ padding: 8, borderRadius: 6, background: '#f3f4f6' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Overall</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{overall}%</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, background: '#f3f4f6' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>This Rem</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{currentAccuracy}%</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => record(true)} style={{ flex: 1, padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6 }}>Correct</button>
        <button onClick={() => record(false)} style={{ flex: 1, padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6 }}>Incorrect</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={exportJSON} style={{ padding: '6px 10px', borderRadius: 6 }}>Export JSON</button>
        <label style={{ padding: '6px 10px', borderRadius: 6, background: '#f3f4f6', cursor: 'pointer' }}>
          Import JSON
          <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
        </label>
        <button onClick={() => resetRem()} style={{ padding: '6px 10px', borderRadius: 6, background: '#fde68a' }}>Reset This Rem</button>
      </div>

      {importError && <div style={{ color: 'red', fontSize: 12 }}>Import error: {importError}</div>}

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 13 }}>Preview (compact)</summary>
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ currentRem, currentAccuracy, overall }, null, 2)}</pre>
        </div>
      </details>

    </div>
  );
}

// If the bundler loads this module directly in the browser, render to document.body
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = document.createElement('div');
  document.body.appendChild(root);
  // dynamic import of react-dom/client if available
  // use legacy ReactDOM.render if createRoot not available
  // we import react-dom dynamically to avoid bundling differences
  // @ts-ignore
  import('react-dom').then((ReactDOM) => {
    // React 17: ReactDOM.render
    // @ts-ignore
    if (typeof ReactDOM.render === 'function') {
      // @ts-ignore
      ReactDOM.render(React.createElement(AccuracyWidget), root);
    } else if (ReactDOM.createRoot) {
      // @ts-ignore
      const r = ReactDOM.createRoot(root);
      r.render(React.createElement(AccuracyWidget));
    }
  });
} catch (e) {
  // ignore
}