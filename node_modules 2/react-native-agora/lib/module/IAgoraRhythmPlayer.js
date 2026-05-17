import './extension/IAgoraRhythmPlayerExtension';

/**
 * Virtual metronome state.
 */
export let RhythmPlayerStateType = /*#__PURE__*/function (RhythmPlayerStateType) {
  RhythmPlayerStateType[RhythmPlayerStateType["RhythmPlayerStateIdle"] = 810] = "RhythmPlayerStateIdle";
  RhythmPlayerStateType[RhythmPlayerStateType["RhythmPlayerStateOpening"] = 811] = "RhythmPlayerStateOpening";
  RhythmPlayerStateType[RhythmPlayerStateType["RhythmPlayerStateDecoding"] = 812] = "RhythmPlayerStateDecoding";
  RhythmPlayerStateType[RhythmPlayerStateType["RhythmPlayerStatePlaying"] = 813] = "RhythmPlayerStatePlaying";
  RhythmPlayerStateType[RhythmPlayerStateType["RhythmPlayerStateFailed"] = 814] = "RhythmPlayerStateFailed";
  return RhythmPlayerStateType;
}({});

/**
 * Virtual Metronome error message.
 */
export let RhythmPlayerReason = /*#__PURE__*/function (RhythmPlayerReason) {
  RhythmPlayerReason[RhythmPlayerReason["RhythmPlayerReasonOk"] = 0] = "RhythmPlayerReasonOk";
  RhythmPlayerReason[RhythmPlayerReason["RhythmPlayerReasonFailed"] = 1] = "RhythmPlayerReasonFailed";
  RhythmPlayerReason[RhythmPlayerReason["RhythmPlayerReasonCanNotOpen"] = 801] = "RhythmPlayerReasonCanNotOpen";
  RhythmPlayerReason[RhythmPlayerReason["RhythmPlayerReasonCanNotPlay"] = 802] = "RhythmPlayerReasonCanNotPlay";
  RhythmPlayerReason[RhythmPlayerReason["RhythmPlayerReasonFileOverDurationLimit"] = 803] = "RhythmPlayerReasonFileOverDurationLimit";
  return RhythmPlayerReason;
}({});

/**
 * The metronome configuration.
 */
export class AgoraRhythmPlayerConfig {}
//# sourceMappingURL=IAgoraRhythmPlayer.js.map