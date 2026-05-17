"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PreloadState = exports.MvProperty = exports.MusicPlayMode = exports.MusicContentCenterStateReason = exports.MusicContentCenterConfiguration = exports.MusicCollection = exports.MusicChartInfo = exports.MusicChartCollection = exports.MusicCacheStatusType = exports.MusicCacheInfo = exports.Music = exports.IMusicPlayer = exports.IMusicContentCenter = exports.ClimaxSegment = void 0;
require("./extension/IAgoraMusicContentCenterExtension");
var _IAgoraMediaPlayer = require("./IAgoraMediaPlayer");
/**
 * @ignore
 */
let MusicPlayMode = /*#__PURE__*/function (MusicPlayMode) {
  MusicPlayMode[MusicPlayMode["KMusicPlayModeOriginal"] = 0] = "KMusicPlayModeOriginal";
  MusicPlayMode[MusicPlayMode["KMusicPlayModeAccompany"] = 1] = "KMusicPlayModeAccompany";
  MusicPlayMode[MusicPlayMode["KMusicPlayModeLeadSing"] = 2] = "KMusicPlayModeLeadSing";
  return MusicPlayMode;
}({});
/**
 * @ignore
 */
exports.MusicPlayMode = MusicPlayMode;
let PreloadState = /*#__PURE__*/function (PreloadState) {
  PreloadState[PreloadState["KPreloadStateCompleted"] = 0] = "KPreloadStateCompleted";
  PreloadState[PreloadState["KPreloadStateFailed"] = 1] = "KPreloadStateFailed";
  PreloadState[PreloadState["KPreloadStatePreloading"] = 2] = "KPreloadStatePreloading";
  PreloadState[PreloadState["KPreloadStateRemoved"] = 3] = "KPreloadStateRemoved";
  return PreloadState;
}({});
/**
 * @ignore
 */
exports.PreloadState = PreloadState;
let MusicContentCenterStateReason = /*#__PURE__*/function (MusicContentCenterStateReason) {
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
exports.MusicContentCenterStateReason = MusicContentCenterStateReason;
class MusicChartInfo {}

/**
 * @ignore
 */
exports.MusicChartInfo = MusicChartInfo;
let MusicCacheStatusType = /*#__PURE__*/function (MusicCacheStatusType) {
  MusicCacheStatusType[MusicCacheStatusType["MusicCacheStatusTypeCached"] = 0] = "MusicCacheStatusTypeCached";
  MusicCacheStatusType[MusicCacheStatusType["MusicCacheStatusTypeCaching"] = 1] = "MusicCacheStatusTypeCaching";
  return MusicCacheStatusType;
}({});
/**
 * @ignore
 */
exports.MusicCacheStatusType = MusicCacheStatusType;
class MusicCacheInfo {}

/**
 * @ignore
 */
exports.MusicCacheInfo = MusicCacheInfo;
class MusicChartCollection {}

/**
 * @ignore
 */
exports.MusicChartCollection = MusicChartCollection;
class MvProperty {}

/**
 * The climax parts of the music.
 */
exports.MvProperty = MvProperty;
class ClimaxSegment {}

/**
 * @ignore
 */
exports.ClimaxSegment = ClimaxSegment;
class Music {}

/**
 * @ignore
 */
exports.Music = Music;
class MusicCollection {}

/**
 * @ignore
 */
exports.MusicCollection = MusicCollection;
/**
 * @ignore
 */
class MusicContentCenterConfiguration {}

/**
 * @ignore
 */
exports.MusicContentCenterConfiguration = MusicContentCenterConfiguration;
class IMusicPlayer extends _IAgoraMediaPlayer.IMediaPlayer {}

/**
 * @ignore
 */
exports.IMusicPlayer = IMusicPlayer;
class IMusicContentCenter {}
exports.IMusicContentCenter = IMusicContentCenter;
//# sourceMappingURL=IAgoraMusicContentCenter.js.map