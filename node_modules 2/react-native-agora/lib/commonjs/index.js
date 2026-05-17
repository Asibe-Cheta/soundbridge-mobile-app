"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  showRPSystemBroadcastPickerView: true,
  createAgoraRtcEngine: true,
  getMediaPlayerCacheManager: true,
  isDebuggable: true,
  setDebuggable: true,
  callIrisApi: true
};
Object.defineProperty(exports, "callIrisApi", {
  enumerable: true,
  get: function () {
    return _IrisApiEngine.callIrisApi;
  }
});
exports.createAgoraRtcEngine = createAgoraRtcEngine;
exports.default = void 0;
exports.getMediaPlayerCacheManager = getMediaPlayerCacheManager;
Object.defineProperty(exports, "isDebuggable", {
  enumerable: true,
  get: function () {
    return _IrisApiEngine.isDebuggable;
  }
});
Object.defineProperty(exports, "setDebuggable", {
  enumerable: true,
  get: function () {
    return _IrisApiEngine.setDebuggable;
  }
});
exports.showRPSystemBroadcastPickerView = void 0;
var _RtcEngineExInternal = require("./internal/RtcEngineExInternal");
var _specs = _interopRequireDefault(require("./specs"));
var _AgoraBase = require("./AgoraBase");
Object.keys(_AgoraBase).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _AgoraBase[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _AgoraBase[key];
    }
  });
});
var _AgoraMediaBase = require("./AgoraMediaBase");
Object.keys(_AgoraMediaBase).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _AgoraMediaBase[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _AgoraMediaBase[key];
    }
  });
});
var _AgoraMediaPlayerTypes = require("./AgoraMediaPlayerTypes");
Object.keys(_AgoraMediaPlayerTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _AgoraMediaPlayerTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _AgoraMediaPlayerTypes[key];
    }
  });
});
var _IAgoraLog = require("./IAgoraLog");
Object.keys(_IAgoraLog).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraLog[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraLog[key];
    }
  });
});
var _IAgoraMediaEngine = require("./IAgoraMediaEngine");
Object.keys(_IAgoraMediaEngine).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraMediaEngine[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraMediaEngine[key];
    }
  });
});
var _IAgoraMediaPlayer = require("./IAgoraMediaPlayer");
Object.keys(_IAgoraMediaPlayer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraMediaPlayer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraMediaPlayer[key];
    }
  });
});
var _IAgoraMediaPlayerSource = require("./IAgoraMediaPlayerSource");
Object.keys(_IAgoraMediaPlayerSource).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraMediaPlayerSource[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraMediaPlayerSource[key];
    }
  });
});
var _IAgoraMediaRecorder = require("./IAgoraMediaRecorder");
Object.keys(_IAgoraMediaRecorder).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraMediaRecorder[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraMediaRecorder[key];
    }
  });
});
var _IAgoraMusicContentCenter = require("./IAgoraMusicContentCenter");
Object.keys(_IAgoraMusicContentCenter).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraMusicContentCenter[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraMusicContentCenter[key];
    }
  });
});
var _IAgoraRhythmPlayer = require("./IAgoraRhythmPlayer");
Object.keys(_IAgoraRhythmPlayer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraRhythmPlayer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraRhythmPlayer[key];
    }
  });
});
var _IAgoraRtcEngine = require("./IAgoraRtcEngine");
Object.keys(_IAgoraRtcEngine).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraRtcEngine[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraRtcEngine[key];
    }
  });
});
var _IAgoraRtcEngineEx = require("./IAgoraRtcEngineEx");
Object.keys(_IAgoraRtcEngineEx).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraRtcEngineEx[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraRtcEngineEx[key];
    }
  });
});
var _IAgoraSpatialAudio = require("./IAgoraSpatialAudio");
Object.keys(_IAgoraSpatialAudio).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAgoraSpatialAudio[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAgoraSpatialAudio[key];
    }
  });
});
var _IAudioDeviceManager = require("./IAudioDeviceManager");
Object.keys(_IAudioDeviceManager).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _IAudioDeviceManager[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _IAudioDeviceManager[key];
    }
  });
});
var _AgoraRtcRenderView = require("./AgoraRtcRenderView");
Object.keys(_AgoraRtcRenderView).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _AgoraRtcRenderView[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _AgoraRtcRenderView[key];
    }
  });
});
var _IrisApiEngine = require("./internal/IrisApiEngine");
var _IAgoraMediaPlayerImpl = require("./impl/IAgoraMediaPlayerImpl");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const showRPSystemBroadcastPickerView = _specs.default.showRPSystemBroadcastPickerView;
exports.showRPSystemBroadcastPickerView = showRPSystemBroadcastPickerView;
const instance = new _RtcEngineExInternal.RtcEngineExInternal();

/**
 * Creates one IRtcEngine object.
 *
 * Currently, the Agora RTC SDK v4.x supports creating only one IRtcEngine object for each app.
 *
 * @returns
 * One IRtcEngine object.
 */
function createAgoraRtcEngine() {
  return instance;
}

/**
 * Gets one IMediaPlayerCacheManager instance.
 *
 * Before calling any APIs in the IMediaPlayerCacheManager class, you need to call this method to get a cache manager instance of a media player.
 *
 * @returns
 * The IMediaPlayerCacheManager instance.
 */
function getMediaPlayerCacheManager() {
  return new _IAgoraMediaPlayerImpl.IMediaPlayerCacheManagerImpl();
}
var _default = createAgoraRtcEngine;
exports.default = _default;
//# sourceMappingURL=index.js.map