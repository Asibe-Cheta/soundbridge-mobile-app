import './extension/IAgoraMusicContentCenterExtension';
import { IMediaPlayer } from './IAgoraMediaPlayer';

/**
 * @ignore
 */
export let MusicPlayMode = /*#__PURE__*/function (MusicPlayMode) {
  MusicPlayMode[MusicPlayMode["KMusicPlayModeOriginal"] = 0] = "KMusicPlayModeOriginal";
  MusicPlayMode[MusicPlayMode["KMusicPlayModeAccompany"] = 1] = "KMusicPlayModeAccompany";
  MusicPlayMode[MusicPlayMode["KMusicPlayModeLeadSing"] = 2] = "KMusicPlayModeLeadSing";
  return MusicPlayMode;
}({});

/**
 * @ignore
 */
export let PreloadState = /*#__PURE__*/function (PreloadState) {
  PreloadState[PreloadState["KPreloadStateCompleted"] = 0] = "KPreloadStateCompleted";
  PreloadState[PreloadState["KPreloadStateFailed"] = 1] = "KPreloadStateFailed";
  PreloadState[PreloadState["KPreloadStatePreloading"] = 2] = "KPreloadStatePreloading";
  PreloadState[PreloadState["KPreloadStateRemoved"] = 3] = "KPreloadStateRemoved";
  return PreloadState;
}({});

/**
 * @ignore
 */
export let MusicContentCenterStateReason = /*#__PURE__*/function (MusicContentCenterStateReason) {
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonOk"] = 0] = "KMusicContentCenterReasonOk";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonError"] = 1] = "KMusicContentCenterReasonError";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonGateway"] = 2] = "KMusicContentCenterReasonGateway";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonPermissionAndResource"] = 3] = "KMusicContentCenterReasonPermissionAndResource";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonInternalDataParse"] = 4] = "KMusicContentCenterReasonInternalDataParse";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonMusicLoading"] = 5] = "KMusicContentCenterReasonMusicLoading";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonMusicDecryption"] = 6] = "KMusicContentCenterReasonMusicDecryption";
  MusicContentCenterStateReason[MusicContentCenterStateReason["KMusicContentCenterReasonHttpInternalError"] = 7] = "KMusicContentCenterReasonHttpInternalError";
  return MusicContentCenterStateReason;
}({});

/**
 * @ignore
 */
export class MusicChartInfo {}

/**
 * @ignore
 */
export let MusicCacheStatusType = /*#__PURE__*/function (MusicCacheStatusType) {
  MusicCacheStatusType[MusicCacheStatusType["MusicCacheStatusTypeCached"] = 0] = "MusicCacheStatusTypeCached";
  MusicCacheStatusType[MusicCacheStatusType["MusicCacheStatusTypeCaching"] = 1] = "MusicCacheStatusTypeCaching";
  return MusicCacheStatusType;
}({});

/**
 * @ignore
 */
export class MusicCacheInfo {}

/**
 * @ignore
 */
export class MusicChartCollection {}

/**
 * @ignore
 */
export class MvProperty {}

/**
 * The climax parts of the music.
 */
export class ClimaxSegment {}

/**
 * @ignore
 */
export class Music {}

/**
 * @ignore
 */
export class MusicCollection {}

/**
 * @ignore
 */

/**
 * @ignore
 */
export class MusicContentCenterConfiguration {}

/**
 * @ignore
 */
export class IMusicPlayer extends IMediaPlayer {}

/**
 * @ignore
 */
export class IMusicContentCenter {}
//# sourceMappingURL=IAgoraMusicContentCenter.js.map