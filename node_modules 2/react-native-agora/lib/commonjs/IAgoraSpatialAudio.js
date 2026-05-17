"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpatialAudioZone = exports.RemoteVoicePositionInfo = exports.ILocalSpatialAudioEngine = void 0;
require("./extension/IAgoraSpatialAudioExtension");
/**
 * The spatial position of the remote user or the media player.
 */
class RemoteVoicePositionInfo {}

/**
 * Sound insulation area settings.
 */
exports.RemoteVoicePositionInfo = RemoteVoicePositionInfo;
class SpatialAudioZone {}

/**
 * This class calculates user positions through the SDK to implement the spatial audio effect.
 *
 * This class inherits from IBaseSpatialAudioEngine. Before calling other APIs in this class, you need to call the initialize method to initialize this class.
 */
exports.SpatialAudioZone = SpatialAudioZone;
class ILocalSpatialAudioEngine {}
exports.ILocalSpatialAudioEngine = ILocalSpatialAudioEngine;
//# sourceMappingURL=IAgoraSpatialAudio.js.map