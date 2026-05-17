import type { ViewProps } from 'react-native';
import { VideoCanvas } from './AgoraBase';
import { RtcConnection } from './IAgoraRtcEngineEx';
import IAgoraRtcRenderView from './internal/IAgoraRtcRenderView';
/**
 * A common property for RtcSurfaceView and RtcTextureView.
 */
export interface RtcRendererViewProps extends ViewProps {
    /**
     * The local video view and settings. See VideoCanvas.
     */
    canvas: VideoCanvas;
    /**
     * The connection infomation. See RtcConnection.
     */
    connection?: RtcConnection;
}
/**
 * Properties of the RtcSurfaceView.
 */
export interface RtcSurfaceViewProps extends RtcRendererViewProps {
    /**
     * Controls whether to place the surface of the RtcSurfaceView on top of the window: true : Place it on top of the window. false : Do not place it on top of another RtcSurfaceView in the window.
     */
    zOrderOnTop?: boolean;
    /**
     * Controls whether to place the surface of the RtcSurfaceView on top of another RtcSurfaceView in the window (but still behind the window): true : Place it on top of another RtcSurfaceView in the window. false : Do not place it on top of another RtcSurfaceView in the window.
     */
    zOrderMediaOverlay?: boolean;
}
/**
 * The RtcSurfaceView class.
 *
 * This class is used for rendering.
 *  Android: This class corresponds to the native SurfaceView.
 *  iOS: This class corresponds to the native UIView. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
export declare class RtcSurfaceView extends IAgoraRtcRenderView<RtcSurfaceViewProps> {
    /**
     * @ignore
     */
    get view(): import("react-native").HostComponent<import("./specs/AgoraRtcSurfaceViewNativeComponent").NativeProps>;
}
/**
 * The RtcTextureView class.
 *
 * This class is used for rendering and corresponds to the Android native TextureView. This class is only available for the Android platform. To ensure the rendering of the image, before calling this component, you should proceed based on whether you are joining a channel:
 *  Not joining a channel: First call startPreview, and then call enableVideo.
 *  Joining a channel: First ensure capture is enabled, and then call enableVideo.
 */
export declare class RtcTextureView extends IAgoraRtcRenderView<RtcRendererViewProps> {
    /**
     * @ignore
     */
    get view(): import("react-native").HostComponent<import("./specs/AgoraRtcTextureViewNativeComponent").NativeProps>;
}
//# sourceMappingURL=AgoraRtcRenderView.d.ts.map