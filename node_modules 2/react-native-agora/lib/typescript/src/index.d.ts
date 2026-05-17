import { IMediaPlayerCacheManager } from './IAgoraMediaPlayer';
import { IRtcEngine } from './IAgoraRtcEngine';
export declare const showRPSystemBroadcastPickerView: any;
export * from './AgoraBase';
export * from './AgoraMediaBase';
export * from './AgoraMediaPlayerTypes';
export * from './IAgoraLog';
export * from './IAgoraMediaEngine';
export * from './IAgoraMediaPlayer';
export * from './IAgoraMediaPlayerSource';
export * from './IAgoraMediaRecorder';
export * from './IAgoraMusicContentCenter';
export * from './IAgoraRhythmPlayer';
export * from './IAgoraRtcEngine';
export * from './IAgoraRtcEngineEx';
export * from './IAgoraSpatialAudio';
export * from './IAudioDeviceManager';
export * from './AgoraRtcRenderView';
export { isDebuggable, setDebuggable, callIrisApi, } from './internal/IrisApiEngine';
/**
 * Creates one IRtcEngine object.
 *
 * Currently, the Agora RTC SDK v4.x supports creating only one IRtcEngine object for each app.
 *
 * @returns
 * One IRtcEngine object.
 */
export declare function createAgoraRtcEngine(): IRtcEngine;
/**
 * Gets one IMediaPlayerCacheManager instance.
 *
 * Before calling any APIs in the IMediaPlayerCacheManager class, you need to call this method to get a cache manager instance of a media player.
 *
 * @returns
 * The IMediaPlayerCacheManager instance.
 */
export declare function getMediaPlayerCacheManager(): IMediaPlayerCacheManager;
export default createAgoraRtcEngine;
//# sourceMappingURL=index.d.ts.map