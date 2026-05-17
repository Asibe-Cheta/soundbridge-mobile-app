"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RtcTextureView = exports.RtcSurfaceView = void 0;
var _IAgoraRtcRenderView = _interopRequireDefault(require("./internal/IAgoraRtcRenderView"));
var _AgoraRtcSurfaceViewNativeComponent = _interopRequireDefault(require("./specs/AgoraRtcSurfaceViewNativeComponent"));
var _AgoraRtcTextureViewNativeComponent = _interopRequireDefault(require("./specs/AgoraRtcTextureViewNativeComponent"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * The RtcSurfaceView class.
 *
 * This class is used for rendering.
 *  Android: This class corresponds to the native SurfaceView.
 *  iOS: This class corresponds to the native UIView. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
class RtcSurfaceView extends _IAgoraRtcRenderView.default {
  /**
   * @ignore
   */
  get view() {
    return _AgoraRtcSurfaceViewNativeComponent.default;
  }
}

/**
 * The RtcTextureView class.
 *
 * This class is used for rendering and corresponds to the Android native TextureView. This class is only available for the Android platform. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
exports.RtcSurfaceView = RtcSurfaceView;
class RtcTextureView extends _IAgoraRtcRenderView.default {
  /**
   * @ignore
   */
  get view() {
    return _AgoraRtcTextureViewNativeComponent.default;
  }
}
exports.RtcTextureView = RtcTextureView;
//# sourceMappingURL=AgoraRtcRenderView.js.map