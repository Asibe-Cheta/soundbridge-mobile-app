import { AppState } from 'react-native';
import { audioLog } from './audioDebugLog';

const loadId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
let evalSeq = 0;

const BUNDLE_EVAL_TRACE_KEY = 'sb_js_eval_last';

/** Unique per JS bundle evaluation (resets on iOS JS context respawn). */
export function getJsBundleLoadId(): string {
  return loadId;
}

/** Log each time a module is evaluated — distinguishes OS JS reload from in-app calls. */
export function markJsBundleEval(source: string): void {
  evalSeq += 1;
  audioLog('JS_BUNDLE_EVAL', {
    source,
    loadId,
    seq: evalSeq,
    appState: AppState.currentState,
  });

  // Persist last eval so we can detect two bundle loads 2–3s apart on launch (Part 3).
  (async () => {
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      const raw = await AS.getItem(BUNDLE_EVAL_TRACE_KEY);
      const prev: { source: string; loadId: string; seq: number; ts: number } | null = raw
        ? JSON.parse(raw)
        : null;
      const now = Date.now();
      const current = { source, loadId, seq: evalSeq, ts: now };
      await AS.setItem(BUNDLE_EVAL_TRACE_KEY, JSON.stringify(current));

      if (prev && prev.loadId !== loadId && now - prev.ts < 15000) {
        audioLog('DOUBLE_INIT_DETECTED', {
          kind: 'SECOND_JS_BUNDLE_EVAL',
          deltaMs: now - prev.ts,
          prevSource: prev.source,
          prevLoadId: prev.loadId,
          prevSeq: prev.seq,
          newSource: source,
          newLoadId: loadId,
          newSeq: evalSeq,
          explanation:
            'Two separate JS bundle evaluations within 15s — new loadId, not React StrictMode double mount',
        });
      }
    } catch {
      /* ignore */
    }
  })();
}
