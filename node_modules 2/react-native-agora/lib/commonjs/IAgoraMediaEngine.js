"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IMediaEngine = exports.AudioMixingDualMonoMode = void 0;
require("./extension/IAgoraMediaEngineExtension");
/**
 * The channel mode.
 */
let AudioMixingDualMonoMode = /*#__PURE__*/function (AudioMixingDualMonoMode) {
  AudioMixingDualMonoMode[AudioMixingDualMonoMode["AudioMixingDualMonoAuto"] = 0] = "AudioMixingDualMonoAuto";
  AudioMixingDualMonoMode[AudioMixingDualMonoMode["AudioMixingDualMonoL"] = 1] = "AudioMixingDualMonoL";
  AudioMixingDualMonoMode[AudioMixingDualMonoMode["AudioMixingDualMonoR"] = 2] = "AudioMixingDualMonoR";
  AudioMixingDualMonoMode[AudioMixingDualMonoMode["AudioMixingDualMonoMix"] = 3] = "AudioMixingDualMonoMix";
  return AudioMixingDualMonoMode;
}({});
/**
 * The IMediaEngine class.
 */
exports.AudioMixingDualMonoMode = AudioMixingDualMonoMode;
class IMediaEngine {}
exports.IMediaEngine = IMediaEngine;
//# sourceMappingURL=IAgoraMediaEngine.js.map