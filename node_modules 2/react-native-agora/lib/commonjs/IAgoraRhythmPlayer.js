"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RhythmPlayerStateType = exports.RhythmPlayerReason = exports.AgoraRhythmPlayerConfig = void 0;
require("./extension/IAgoraRhythmPlayerExtension");
/**
 * Virtual metronome state.
 */
let RhythmPlayerStateType = /*#__PURE__*/function (RhythmPlayerStateType) {
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
exports.RhythmPlayerStateType = RhythmPlayerStateType;
let RhythmPlayerReason = /*#__PURE__*/function (RhythmPlayerReason) {
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
exports.RhythmPlayerReason = RhythmPlayerReason;
class AgoraRhythmPlayerConfig {}
exports.AgoraRhythmPlayerConfig = AgoraRhythmPlayerConfig;
//# sourceMappingURL=IAgoraRhythmPlayer.js.map