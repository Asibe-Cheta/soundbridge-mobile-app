import IAgoraRtcRenderView from './internal/IAgoraRtcRenderView';
import AgoraRtcSurfaceViewNativeComponent from './specs/AgoraRtcSurfaceViewNativeComponent';
import AgoraRtcTextureViewNativeComponent from './specs/AgoraRtcTextureViewNativeComponent';

/**
 * A common property for RtcSurfaceView and RtcTextureView.
 */

/**
 * The RtcSurfaceView class.
 *
 * This class is used for rendering.
 *  Android: This class corresponds to the native SurfaceView.
 *  iOS: This class corresponds to the native UIView. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
export class RtcSurfaceView extends IAgoraRtcRenderView {
  /**
   * @ignore
   */
  get view() {
    return AgoraRtcSurfaceViewNativeComponent;
  }
}

/**
 * The RtcTextureView class.
 *
 * This class is used for rendering and corresponds to the Android native TextureView. This class is only available for the Android platform. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
export class RtcTextureView extends IAgoraRtcRenderView {
  /**
   * @ignore
   */
  get view() {
    return AgoraRtcTextureViewNativeComponent;
  }
}
//# sourceMappingURL=AgoraRtcRenderView.js.map