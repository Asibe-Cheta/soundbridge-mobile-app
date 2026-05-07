# Android White Screen Fix — TrackPlayer TurboModule Crash

**Date fixed:** 2026-05-07  
**Build that first worked:** versionCode 90 (`04d36ddd-1a8b-42ec-a869-0f1f54b51848`)  
**Builds that failed before:** 85, 86, 87, 88, 89

---

## The Symptom

Android production app showed a white screen immediately on launch. No JS ever ran. The crash was a native-layer fatal before the React Native runtime could start.

Logcat error:
```
Unable to parse @ReactMethod annotations from native module: TrackPlayerModule.
Details: TurboModule system assumes returnType == void iff the method is synchronous.
```

iOS was unaffected (different native module loading path).

---

## Root Cause

`react-native-track-player@4.1.2` uses Kotlin's **expression body** syntax for its `@ReactMethod` functions:

```kotlin
// ORIGINAL — broken
@ReactMethod
fun updateOptions(data: ReadableMap?, callback: Promise) = scope.launch {
    val options = Arguments.toBundle(data)
    options?.let { musicService.updateOptions(it) }
    callback.resolve(null)
}
```

In Kotlin, `fun foo() = scope.launch { }` is syntactic sugar where the function's return type is inferred as `Job` (the return type of `scope.launch`). This is **not void**.

React Native's New Architecture (`TurboModuleInteropUtils.kt`) inspects `@ReactMethod` return types at startup. Its rule: **every `@ReactMethod` must return `void`** (i.e., Kotlin `Unit`). When it encounters a `Job`-returning method, it throws a `ParsingException` that crashes the app before any JavaScript loads.

All 37 `@ReactMethod` functions in `MusicModule.kt` had this problem.

---

## The Fix (What Actually Works)

Convert all 37 expression-body `@ReactMethod` functions to **block body** syntax, so Kotlin infers return type `Unit` (void):

```kotlin
// FIXED — returns Unit (void)
@ReactMethod
fun updateOptions(data: ReadableMap?, callback: Promise) {
    scope.launch {
        val options = Arguments.toBundle(data)
        options?.let { musicService.updateOptions(it) }
        callback.resolve(null)
    }
}
```

Additionally, two functions passed `Bundle?` (nullable) to `Arguments.fromBundle()` which requires non-null `Bundle`. Kotlin 2.1.20's stricter Java interop enforcement turned these into compile errors:

```kotlin
// MusicModule.kt line 602 — getTrack()
// BROKEN:  Arguments.fromBundle(musicService.tracks[index].originalItem)
// FIXED:   Arguments.fromBundle(musicService.tracks[index].originalItem!!)

// MusicModule.kt line 650 — getActiveTrack()
// BROKEN:  musicService.tracks[musicService.getCurrentTrackIndex()].originalItem
// FIXED:   musicService.tracks[musicService.getCurrentTrackIndex()].originalItem!!
```

`Track.originalItem` is always set at track creation time, so `!!` is safe.

---

## How the Fix Is Delivered — patch-package

Since we can't fork the npm package, the fix is applied via **patch-package**:

```
patches/react-native-track-player+4.1.2.patch   ← 653-line diff of MusicModule.kt
```

`package.json` runs it automatically after every install:
```json
"scripts": {
    "postinstall": "patch-package"
},
"dependencies": {
    "patch-package": "^8.0.1"
}
```

This runs **after** `npm install`, so the patched file is always in place when Gradle compiles.

---

## How the Patch Was Generated

1. Installed the package fresh to get a clean baseline:
   ```bash
   cd /tmp/sb-fresh
   ```

2. Ran a Python script (`/tmp/fix_musicmodule.py`) that transformed all 37 methods. The script uses brace-depth counting to find each function's closing `}`:

   **Pattern 1** — single-line: `fun foo(...) = scope.launch {`  
   **Pattern 2** — two-line: `fun foo(...) =` / `        scope.launch {`

   Both patterns rewrite the signature to `fun foo(...) {` and wrap the body in `scope.launch { ... }`.

3. Manually fixed the two `Bundle?` nullability errors by adding `!!`.

4. Regenerated the patch:
   ```bash
   npx patch-package react-native-track-player
   ```

5. Verified the patch:
   ```bash
   # Zero expression-body methods remaining in the added (+) lines:
   grep "^+" patches/react-native-track-player+4.1.2.patch | grep "= scope\.launch" | wc -l
   # → 0
   
   # Both !! fixes present:
   grep "originalItem!!" patches/react-native-track-player+4.1.2.patch
   ```

---

## Why Earlier Approaches Failed (Builds 85–89)

### Build 85 — wrong patch base
The patch was generated from an already-modified file (not the original npm source). `patch-package` diffs against a fresh download; the patch had the wrong base and failed to apply entirely.

### Build 86 — config plugin runs before npm install
A config plugin (`plugins/withTrackPlayerFix.js`) was used to copy the fixed `MusicModule.kt` into `node_modules/` during `expo prebuild`. This worked locally but **failed on EAS** because EAS runs `expo prebuild` → then `npm install`. The destination path didn't exist yet when the plugin ran, so it silently skipped. `npm install` then overwrote with the original broken file.

### Build 87 — macOS duplicate-file artifacts in patch
The patch was regenerated from a `node_modules/` directory that had macOS space-numbered duplicates (`LICENSE 2`, `android 4`, `ios 3`, etc. — created by macOS when copying to an existing folder). These files don't exist in the original npm package, so they all appeared in the patch as additions. The patch grew to ~14,000 lines (from 653) and failed to apply on the EAS Linux server.

Fix: removed all space-named duplicates before regenerating:
```bash
find . -name "* [0-9]*" | while IFS= read -r f; do rm -rf "$f"; done
```

### Build 88 — patch applied but Bundle? errors
The clean 653-line patch applied correctly. But Kotlin 2.1.20 (stricter Java interop null safety vs 1.x) flagged `Arguments.fromBundle(Bundle?)` as a type error at lines 602 and 650. Build failed at `compileReleaseKotlin`.

### Build 89 — same Bundle? errors (patch regenerated without fix)
Another attempt with the patch but without the `!!` fix. Same Kotlin errors.

### Build 90 — SUCCESS ✓
Patch with both the expression-body transforms AND the `!!` null assertions. Compiled cleanly.

---

## Key Technical Details

| Detail | Value |
|--------|-------|
| Package | `react-native-track-player@4.1.2` |
| File patched | `android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt` |
| Methods transformed | 37 `@ReactMethod` functions |
| Patch size | 653 lines |
| Kotlin version | 2.1.20 |
| Delivery mechanism | `patch-package` via `postinstall` |
| Patch location | `patches/react-native-track-player+4.1.2.patch` |

---

## If You Upgrade react-native-track-player

The patch will break against a different version. Steps to re-patch:

1. Install the new version and check if the expression body issue is fixed upstream (it may be in newer releases).
2. If not, re-run `fix_musicmodule.py` (kept at `/tmp/fix_musicmodule.py`) against the new `MusicModule.kt`.
3. Check for any Kotlin nullability errors (search for `Bundle?` calls into Java methods expecting `Bundle`).
4. Run `npx patch-package react-native-track-player` to regenerate `patches/react-native-track-player+4.1.2.patch` (rename the file to match the new version).
5. Verify with `grep "^+" patches/... | grep "= scope\.launch"` — must return 0.

---

## Files Changed in This Fix

```
patches/react-native-track-player+4.1.2.patch   ← the actual fix (applied by patch-package)
plugins/TrackPlayerMusicModule.kt                ← local copy of the fixed file (for reference)
plugins/withTrackPlayerFix.js                    ← config plugin (NOT used on EAS, kept for local dev)
package.json                                     ← added postinstall + patch-package dependency
```
