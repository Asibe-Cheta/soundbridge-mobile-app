"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.H265TranscoderInternal = void 0;
var _tsInterfaceChecker = require("ts-interface-checker");
var _IAgoraH265TranscoderImpl = require("../impl/IAgoraH265TranscoderImpl");
var _IAgoraH265TranscoderTi = _interopRequireDefault(require("../ti/IAgoraH265Transcoder-ti"));
var _IrisApiEngine = require("./IrisApiEngine");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const checkers = (0, _tsInterfaceChecker.createCheckers)(_IAgoraH265TranscoderTi.default);
class H265TranscoderInternal extends _IAgoraH265TranscoderImpl.IH265TranscoderImpl {
  static _h265_transcoder_observers = [];
  release() {
    H265TranscoderInternal._h265_transcoder_observers = [];
    this.removeAllListeners();
  }
  _addListenerPreCheck(eventType) {
    var _checkers$IH265Transc;
    if ((_checkers$IH265Transc = checkers.IH265TranscoderObserver) !== null && _checkers$IH265Transc !== void 0 && _checkers$IH265Transc.strictTest({
      [eventType]: undefined
    })) {
      if (H265TranscoderInternal._h265_transcoder_observers.length === 0) {
        this.registerTranscoderObserver({});
      }
    }
    return true;
  }
  addListener(eventType, listener) {
    this._addListenerPreCheck(eventType);
    const callback = (eventProcessor, data) => {
      if (eventProcessor.type(data) !== _IrisApiEngine.EVENT_TYPE.IAgoraH265Transcoder) {
        return;
      }
      eventProcessor.func.map(it => {
        it({
          [eventType]: listener
        }, eventType, data);
      });
    };
    // @ts-ignore
    listener.agoraCallback = callback;
    _IrisApiEngine.DeviceEventEmitter.addListener(eventType, callback);
  }
  removeListener(eventType, listener) {
    _IrisApiEngine.DeviceEventEmitter.removeListener(eventType,
    // @ts-ignore
    (listener === null || listener === void 0 ? void 0 : listener.agoraCallback) ?? listener);
  }
  removeAllListeners(eventType) {
    _IrisApiEngine.DeviceEventEmitter.removeAllListeners(eventType);
  }
  registerTranscoderObserver(observer) {
    if (!H265TranscoderInternal._h265_transcoder_observers.find(value => value === observer)) {
      H265TranscoderInternal._h265_transcoder_observers.push(observer);
    }
    return super.registerTranscoderObserver(observer);
  }
  unregisterTranscoderObserver(observer) {
    H265TranscoderInternal._h265_transcoder_observers = H265TranscoderInternal._h265_transcoder_observers.filter(value => value !== observer);
    return super.unregisterTranscoderObserver(observer);
  }
}
exports.H265TranscoderInternal = H265TranscoderInternal;
//# sourceMappingURL=AgoraH265TranscoderInternal.js.map