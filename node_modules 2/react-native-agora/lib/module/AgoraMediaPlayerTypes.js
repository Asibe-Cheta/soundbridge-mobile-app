import './extension/AgoraMediaPlayerTypesExtension';

/**
 * The playback state.
 */
export let MediaPlayerState = /*#__PURE__*/function (MediaPlayerState) {
  MediaPlayerState[MediaPlayerState["PlayerStateIdle"] = 0] = "PlayerStateIdle";
  MediaPlayerState[MediaPlayerState["PlayerStateOpening"] = 1] = "PlayerStateOpening";
  MediaPlayerState[MediaPlayerState["PlayerStateOpenCompleted"] = 2] = "PlayerStateOpenCompleted";
  MediaPlayerState[MediaPlayerState["PlayerStatePlaying"] = 3] = "PlayerStatePlaying";
  MediaPlayerState[MediaPlayerState["PlayerStatePaused"] = 4] = "PlayerStatePaused";
  MediaPlayerState[MediaPlayerState["PlayerStatePlaybackCompleted"] = 5] = "PlayerStatePlaybackCompleted";
  MediaPlayerState[MediaPlayerState["PlayerStatePlaybackAllLoopsCompleted"] = 6] = "PlayerStatePlaybackAllLoopsCompleted";
  MediaPlayerState[MediaPlayerState["PlayerStateStopped"] = 7] = "PlayerStateStopped";
  MediaPlayerState[MediaPlayerState["PlayerStatePausingInternal"] = 50] = "PlayerStatePausingInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateStoppingInternal"] = 51] = "PlayerStateStoppingInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateSeekingInternal"] = 52] = "PlayerStateSeekingInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateGettingInternal"] = 53] = "PlayerStateGettingInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateNoneInternal"] = 54] = "PlayerStateNoneInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateDoNothingInternal"] = 55] = "PlayerStateDoNothingInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateSetTrackInternal"] = 56] = "PlayerStateSetTrackInternal";
  MediaPlayerState[MediaPlayerState["PlayerStateFailed"] = 100] = "PlayerStateFailed";
  return MediaPlayerState;
}({});

/**
 * Reasons for the changes in the media player status.
 */
export let MediaPlayerReason = /*#__PURE__*/function (MediaPlayerReason) {
  MediaPlayerReason[MediaPlayerReason["PlayerReasonNone"] = 0] = "PlayerReasonNone";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInvalidArguments"] = -1] = "PlayerReasonInvalidArguments";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInternal"] = -2] = "PlayerReasonInternal";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonNoResource"] = -3] = "PlayerReasonNoResource";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInvalidMediaSource"] = -4] = "PlayerReasonInvalidMediaSource";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonUnknownStreamType"] = -5] = "PlayerReasonUnknownStreamType";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonObjNotInitialized"] = -6] = "PlayerReasonObjNotInitialized";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonCodecNotSupported"] = -7] = "PlayerReasonCodecNotSupported";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonVideoRenderFailed"] = -8] = "PlayerReasonVideoRenderFailed";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInvalidState"] = -9] = "PlayerReasonInvalidState";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonUrlNotFound"] = -10] = "PlayerReasonUrlNotFound";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInvalidConnectionState"] = -11] = "PlayerReasonInvalidConnectionState";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonSrcBufferUnderflow"] = -12] = "PlayerReasonSrcBufferUnderflow";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonInterrupted"] = -13] = "PlayerReasonInterrupted";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonNotSupported"] = -14] = "PlayerReasonNotSupported";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonTokenExpired"] = -15] = "PlayerReasonTokenExpired";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonIpExpired"] = -16] = "PlayerReasonIpExpired";
  MediaPlayerReason[MediaPlayerReason["PlayerReasonUnknown"] = -17] = "PlayerReasonUnknown";
  return MediaPlayerReason;
}({});

/**
 * The type of the media stream.
 */
export let MediaStreamType = /*#__PURE__*/function (MediaStreamType) {
  MediaStreamType[MediaStreamType["StreamTypeUnknown"] = 0] = "StreamTypeUnknown";
  MediaStreamType[MediaStreamType["StreamTypeVideo"] = 1] = "StreamTypeVideo";
  MediaStreamType[MediaStreamType["StreamTypeAudio"] = 2] = "StreamTypeAudio";
  MediaStreamType[MediaStreamType["StreamTypeSubtitle"] = 3] = "StreamTypeSubtitle";
  return MediaStreamType;
}({});

/**
 * Media player events.
 */
export let MediaPlayerEvent = /*#__PURE__*/function (MediaPlayerEvent) {
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSeekBegin"] = 0] = "PlayerEventSeekBegin";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSeekComplete"] = 1] = "PlayerEventSeekComplete";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSeekError"] = 2] = "PlayerEventSeekError";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventAudioTrackChanged"] = 5] = "PlayerEventAudioTrackChanged";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventBufferLow"] = 6] = "PlayerEventBufferLow";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventBufferRecover"] = 7] = "PlayerEventBufferRecover";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventFreezeStart"] = 8] = "PlayerEventFreezeStart";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventFreezeStop"] = 9] = "PlayerEventFreezeStop";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSwitchBegin"] = 10] = "PlayerEventSwitchBegin";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSwitchComplete"] = 11] = "PlayerEventSwitchComplete";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventSwitchError"] = 12] = "PlayerEventSwitchError";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventFirstDisplayed"] = 13] = "PlayerEventFirstDisplayed";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventReachCacheFileMaxCount"] = 14] = "PlayerEventReachCacheFileMaxCount";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventReachCacheFileMaxSize"] = 15] = "PlayerEventReachCacheFileMaxSize";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventTryOpenStart"] = 16] = "PlayerEventTryOpenStart";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventTryOpenSucceed"] = 17] = "PlayerEventTryOpenSucceed";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventTryOpenFailed"] = 18] = "PlayerEventTryOpenFailed";
  MediaPlayerEvent[MediaPlayerEvent["PlayerEventHttpRedirect"] = 19] = "PlayerEventHttpRedirect";
  return MediaPlayerEvent;
}({});

/**
 * Events that occur when media resources are preloaded.
 */
export let PlayerPreloadEvent = /*#__PURE__*/function (PlayerPreloadEvent) {
  PlayerPreloadEvent[PlayerPreloadEvent["PlayerPreloadEventBegin"] = 0] = "PlayerPreloadEventBegin";
  PlayerPreloadEvent[PlayerPreloadEvent["PlayerPreloadEventComplete"] = 1] = "PlayerPreloadEventComplete";
  PlayerPreloadEvent[PlayerPreloadEvent["PlayerPreloadEventError"] = 2] = "PlayerPreloadEventError";
  return PlayerPreloadEvent;
}({});

/**
 * The detailed information of the media stream.
 */
export class PlayerStreamInfo {}

/**
 * Information about the video bitrate of the media resource being played.
 */
export class SrcInfo {}

/**
 * The type of media metadata.
 */
export let MediaPlayerMetadataType = /*#__PURE__*/function (MediaPlayerMetadataType) {
  MediaPlayerMetadataType[MediaPlayerMetadataType["PlayerMetadataTypeUnknown"] = 0] = "PlayerMetadataTypeUnknown";
  MediaPlayerMetadataType[MediaPlayerMetadataType["PlayerMetadataTypeSei"] = 1] = "PlayerMetadataTypeSei";
  return MediaPlayerMetadataType;
}({});

/**
 * Statistics about the media files being cached.
 */
export class CacheStatistics {}

/**
 * The information of the media file being played.
 */
export class PlayerPlaybackStats {}

/**
 * Information related to the media player.
 */
export class PlayerUpdatedInfo {}

/**
 * Information related to the media file to be played and the playback scenario configurations.
 */
export class MediaSource {}
//# sourceMappingURL=AgoraMediaPlayerTypes.js.map