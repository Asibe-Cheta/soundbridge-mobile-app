"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MaxDeviceIdLengthType = exports.IAudioDeviceManager = void 0;
require("./extension/IAudioDeviceManagerExtension");
/**
 * The maximum length of the device ID.
 */
let MaxDeviceIdLengthType = /*#__PURE__*/function (MaxDeviceIdLengthType) {
  MaxDeviceIdLengthType[MaxDeviceIdLengthType["MaxDeviceIdLength"] = 512] = "MaxDeviceIdLength";
  return MaxDeviceIdLengthType;
}({});
/**
 * Audio device management methods.
 */
exports.MaxDeviceIdLengthType = MaxDeviceIdLengthType;
class IAudioDeviceManager {}
exports.IAudioDeviceManager = IAudioDeviceManager;
//# sourceMappingURL=IAudioDeviceManager.js.map