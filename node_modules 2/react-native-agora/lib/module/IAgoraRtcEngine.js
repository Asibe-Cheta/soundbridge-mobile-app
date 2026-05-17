import './extension/IAgoraRtcEngineExtension';
/**
 * Media device types.
 */
export let MediaDeviceType = /*#__PURE__*/function (MediaDeviceType) {
  MediaDeviceType[MediaDeviceType["UnknownAudioDevice"] = -1] = "UnknownAudioDevice";
  MediaDeviceType[MediaDeviceType["AudioPlayoutDevice"] = 0] = "AudioPlayoutDevice";
  MediaDeviceType[MediaDeviceType["AudioRecordingDevice"] = 1] = "AudioRecordingDevice";
  MediaDeviceType[MediaDeviceType["VideoRenderDevice"] = 2] = "VideoRenderDevice";
  MediaDeviceType[MediaDeviceType["VideoCaptureDevice"] = 3] = "VideoCaptureDevice";
  MediaDeviceType[MediaDeviceType["AudioApplicationPlayoutDevice"] = 4] = "AudioApplicationPlayoutDevice";
  MediaDeviceType[MediaDeviceType["AudioVirtualPlayoutDevice"] = 5] = "AudioVirtualPlayoutDevice";
  MediaDeviceType[MediaDeviceType["AudioVirtualRecordingDevice"] = 6] = "AudioVirtualRecordingDevice";
  return MediaDeviceType;
}({});

/**
 * The playback state of the music file.
 */
export let AudioMixingStateType = /*#__PURE__*/function (AudioMixingStateType) {
  AudioMixingStateType[AudioMixingStateType["AudioMixingStatePlaying"] = 710] = "AudioMixingStatePlaying";
  AudioMixingStateType[AudioMixingStateType["AudioMixingStatePaused"] = 711] = "AudioMixingStatePaused";
  AudioMixingStateType[AudioMixingStateType["AudioMixingStateStopped"] = 713] = "AudioMixingStateStopped";
  AudioMixingStateType[AudioMixingStateType["AudioMixingStateFailed"] = 714] = "AudioMixingStateFailed";
  return AudioMixingStateType;
}({});

/**
 * The reason why the playback state of the music file changes. Reported in the onAudioMixingStateChanged callback.
 */
export let AudioMixingReasonType = /*#__PURE__*/function (AudioMixingReasonType) {
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonCanNotOpen"] = 701] = "AudioMixingReasonCanNotOpen";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonTooFrequentCall"] = 702] = "AudioMixingReasonTooFrequentCall";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonInterruptedEof"] = 703] = "AudioMixingReasonInterruptedEof";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonOneLoopCompleted"] = 721] = "AudioMixingReasonOneLoopCompleted";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonAllLoopsCompleted"] = 723] = "AudioMixingReasonAllLoopsCompleted";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonStoppedByUser"] = 724] = "AudioMixingReasonStoppedByUser";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonResumedByUser"] = 726] = "AudioMixingReasonResumedByUser";
  AudioMixingReasonType[AudioMixingReasonType["AudioMixingReasonOk"] = 0] = "AudioMixingReasonOk";
  return AudioMixingReasonType;
}({});

/**
 * @ignore
 */
export let InjectStreamStatus = /*#__PURE__*/function (InjectStreamStatus) {
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStartSuccess"] = 0] = "InjectStreamStatusStartSuccess";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStartAlreadyExists"] = 1] = "InjectStreamStatusStartAlreadyExists";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStartUnauthorized"] = 2] = "InjectStreamStatusStartUnauthorized";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStartTimedout"] = 3] = "InjectStreamStatusStartTimedout";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStartFailed"] = 4] = "InjectStreamStatusStartFailed";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStopSuccess"] = 5] = "InjectStreamStatusStopSuccess";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStopNotFound"] = 6] = "InjectStreamStatusStopNotFound";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStopUnauthorized"] = 7] = "InjectStreamStatusStopUnauthorized";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStopTimedout"] = 8] = "InjectStreamStatusStopTimedout";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusStopFailed"] = 9] = "InjectStreamStatusStopFailed";
  InjectStreamStatus[InjectStreamStatus["InjectStreamStatusBroken"] = 10] = "InjectStreamStatusBroken";
  return InjectStreamStatus;
}({});

/**
 * The midrange frequency for audio equalization.
 */
export let AudioEqualizationBandFrequency = /*#__PURE__*/function (AudioEqualizationBandFrequency) {
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand31"] = 0] = "AudioEqualizationBand31";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand62"] = 1] = "AudioEqualizationBand62";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand125"] = 2] = "AudioEqualizationBand125";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand250"] = 3] = "AudioEqualizationBand250";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand500"] = 4] = "AudioEqualizationBand500";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand1k"] = 5] = "AudioEqualizationBand1k";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand2k"] = 6] = "AudioEqualizationBand2k";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand4k"] = 7] = "AudioEqualizationBand4k";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand8k"] = 8] = "AudioEqualizationBand8k";
  AudioEqualizationBandFrequency[AudioEqualizationBandFrequency["AudioEqualizationBand16k"] = 9] = "AudioEqualizationBand16k";
  return AudioEqualizationBandFrequency;
}({});

/**
 * Audio reverberation types.
 */
export let AudioReverbType = /*#__PURE__*/function (AudioReverbType) {
  AudioReverbType[AudioReverbType["AudioReverbDryLevel"] = 0] = "AudioReverbDryLevel";
  AudioReverbType[AudioReverbType["AudioReverbWetLevel"] = 1] = "AudioReverbWetLevel";
  AudioReverbType[AudioReverbType["AudioReverbRoomSize"] = 2] = "AudioReverbRoomSize";
  AudioReverbType[AudioReverbType["AudioReverbWetDelay"] = 3] = "AudioReverbWetDelay";
  AudioReverbType[AudioReverbType["AudioReverbStrength"] = 4] = "AudioReverbStrength";
  return AudioReverbType;
}({});

/**
 * @ignore
 */
export let StreamFallbackOptions = /*#__PURE__*/function (StreamFallbackOptions) {
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionDisabled"] = 0] = "StreamFallbackOptionDisabled";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLow"] = 1] = "StreamFallbackOptionVideoStreamLow";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionAudioOnly"] = 2] = "StreamFallbackOptionAudioOnly";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer1"] = 3] = "StreamFallbackOptionVideoStreamLayer1";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer2"] = 4] = "StreamFallbackOptionVideoStreamLayer2";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer3"] = 5] = "StreamFallbackOptionVideoStreamLayer3";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer4"] = 6] = "StreamFallbackOptionVideoStreamLayer4";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer5"] = 7] = "StreamFallbackOptionVideoStreamLayer5";
  StreamFallbackOptions[StreamFallbackOptions["StreamFallbackOptionVideoStreamLayer6"] = 8] = "StreamFallbackOptionVideoStreamLayer6";
  return StreamFallbackOptions;
}({});

/**
 * @ignore
 */
export let PriorityType = /*#__PURE__*/function (PriorityType) {
  PriorityType[PriorityType["PriorityHigh"] = 50] = "PriorityHigh";
  PriorityType[PriorityType["PriorityNormal"] = 100] = "PriorityNormal";
  return PriorityType;
}({});

/**
 * The statistics of the local video stream.
 */
export class LocalVideoStats {}

/**
 * Audio statistics of the remote user.
 */
export class RemoteAudioStats {}

/**
 * Statistics of the remote video stream.
 */
export class RemoteVideoStats {}

/**
 * @ignore
 */
export class Region {}

/**
 * @ignore
 */
export class VideoCompositingLayout {}

/**
 * @ignore
 */
export class InjectStreamConfig {}

/**
 * Lifecycle of the CDN live video stream.
 *
 * Deprecated
 */
export let RtmpStreamLifeCycleType = /*#__PURE__*/function (RtmpStreamLifeCycleType) {
  RtmpStreamLifeCycleType[RtmpStreamLifeCycleType["RtmpStreamLifeCycleBind2channel"] = 1] = "RtmpStreamLifeCycleBind2channel";
  RtmpStreamLifeCycleType[RtmpStreamLifeCycleType["RtmpStreamLifeCycleBind2owner"] = 2] = "RtmpStreamLifeCycleBind2owner";
  return RtmpStreamLifeCycleType;
}({});

/**
 * @ignore
 */
export class PublisherConfiguration {}

/**
 * The camera direction.
 */
export let CameraDirection = /*#__PURE__*/function (CameraDirection) {
  CameraDirection[CameraDirection["CameraRear"] = 0] = "CameraRear";
  CameraDirection[CameraDirection["CameraFront"] = 1] = "CameraFront";
  return CameraDirection;
}({});

/**
 * The cloud proxy type.
 */
export let CloudProxyType = /*#__PURE__*/function (CloudProxyType) {
  CloudProxyType[CloudProxyType["NoneProxy"] = 0] = "NoneProxy";
  CloudProxyType[CloudProxyType["UdpProxy"] = 1] = "UdpProxy";
  CloudProxyType[CloudProxyType["TcpProxy"] = 2] = "TcpProxy";
  return CloudProxyType;
}({});

/**
 * The camera capturer preference.
 */
export class CameraCapturerConfiguration {}

/**
 * @ignore
 */
export class ScreenCaptureConfiguration {}

/**
 * @ignore
 */
export class Size {}

/**
 * @ignore
 */
export class ThumbImageBuffer {}

/**
 * @ignore
 */
export let ScreenCaptureSourceType = /*#__PURE__*/function (ScreenCaptureSourceType) {
  ScreenCaptureSourceType[ScreenCaptureSourceType["ScreencapturesourcetypeUnknown"] = -1] = "ScreencapturesourcetypeUnknown";
  ScreenCaptureSourceType[ScreenCaptureSourceType["ScreencapturesourcetypeWindow"] = 0] = "ScreencapturesourcetypeWindow";
  ScreenCaptureSourceType[ScreenCaptureSourceType["ScreencapturesourcetypeScreen"] = 1] = "ScreencapturesourcetypeScreen";
  ScreenCaptureSourceType[ScreenCaptureSourceType["ScreencapturesourcetypeCustom"] = 2] = "ScreencapturesourcetypeCustom";
  return ScreenCaptureSourceType;
}({});

/**
 * @ignore
 */
export class ScreenCaptureSourceInfo {}

/**
 * The advanced options for audio.
 */
export class AdvancedAudioOptions {}

/**
 * Image configurations.
 */
export class ImageTrackOptions {}

/**
 * The channel media options.
 *
 * Agora supports publishing multiple audio streams and one video stream at the same time and in the same RtcConnection. For example, publishMicrophoneTrack, publishCustomAudioTrack, and publishMediaPlayerAudioTrack can be set as true at the same time, but only one of publishCameraTrack, publishScreenCaptureVideo, publishCustomVideoTrack, or publishEncodedVideoTrack can be set as true. Agora recommends that you set member parameter values yourself according to your business scenario, otherwise the SDK will automatically assign values to member parameters.
 */
export class ChannelMediaOptions {}

/**
 * The cloud proxy type.
 */
export let ProxyType = /*#__PURE__*/function (ProxyType) {
  ProxyType[ProxyType["NoneProxyType"] = 0] = "NoneProxyType";
  ProxyType[ProxyType["UdpProxyType"] = 1] = "UdpProxyType";
  ProxyType[ProxyType["TcpProxyType"] = 2] = "TcpProxyType";
  ProxyType[ProxyType["LocalProxyType"] = 3] = "LocalProxyType";
  ProxyType[ProxyType["TcpProxyAutoFallbackType"] = 4] = "TcpProxyAutoFallbackType";
  ProxyType[ProxyType["HttpProxyType"] = 5] = "HttpProxyType";
  ProxyType[ProxyType["HttpsProxyType"] = 6] = "HttpsProxyType";
  return ProxyType;
}({});

/**
 * The type of the advanced feature.
 */
export let FeatureType = /*#__PURE__*/function (FeatureType) {
  FeatureType[FeatureType["VideoVirtualBackground"] = 1] = "VideoVirtualBackground";
  FeatureType[FeatureType["VideoBeautyEffect"] = 2] = "VideoBeautyEffect";
  return FeatureType;
}({});

/**
 * The options for leaving a channel.
 */
export class LeaveChannelOptions {}

/**
 * The SDK uses the IRtcEngineEventHandler interface to send event notifications to your app. Your app can get those notifications through methods that inherit this interface.
 *
 * All methods in this interface have default (empty) implementation. You can choose to inherit events related to your app scenario.
 *  In the callbacks, avoid implementing time-consuming tasks or calling APIs that may cause thread blocking (such as sendMessage). Otherwise, the SDK may not work properly.
 *  The SDK no longer catches exceptions in the code logic that developers implement themselves in IRtcEngineEventHandler class. You need to handle this exception yourself, otherwise the app may crash when the exception occurs.
 */

/**
 * Video device management methods.
 */
export class IVideoDeviceManager {}

/**
 * Configurations for the RtcEngineContext instance.
 */
export class RtcEngineContext {}

/**
 * Metadata type of the observer. We only support video metadata for now.
 */
export let MetadataType = /*#__PURE__*/function (MetadataType) {
  MetadataType[MetadataType["UnknownMetadata"] = -1] = "UnknownMetadata";
  MetadataType[MetadataType["VideoMetadata"] = 0] = "VideoMetadata";
  return MetadataType;
}({});

/**
 * @ignore
 */
export let MaxMetadataSizeType = /*#__PURE__*/function (MaxMetadataSizeType) {
  MaxMetadataSizeType[MaxMetadataSizeType["InvalidMetadataSizeInByte"] = -1] = "InvalidMetadataSizeInByte";
  MaxMetadataSizeType[MaxMetadataSizeType["DefaultMetadataSizeInByte"] = 512] = "DefaultMetadataSizeInByte";
  MaxMetadataSizeType[MaxMetadataSizeType["MaxMetadataSizeInByte"] = 1024] = "MaxMetadataSizeInByte";
  return MaxMetadataSizeType;
}({});

/**
 * Media metadata.
 */
export class Metadata {}

/**
 * The metadata observer.
 */

/**
 * Reasons for the changes in CDN streaming status.
 */
export let DirectCdnStreamingReason = /*#__PURE__*/function (DirectCdnStreamingReason) {
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonOk"] = 0] = "DirectCdnStreamingReasonOk";
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonFailed"] = 1] = "DirectCdnStreamingReasonFailed";
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonAudioPublication"] = 2] = "DirectCdnStreamingReasonAudioPublication";
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonVideoPublication"] = 3] = "DirectCdnStreamingReasonVideoPublication";
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonNetConnect"] = 4] = "DirectCdnStreamingReasonNetConnect";
  DirectCdnStreamingReason[DirectCdnStreamingReason["DirectCdnStreamingReasonBadName"] = 5] = "DirectCdnStreamingReasonBadName";
  return DirectCdnStreamingReason;
}({});

/**
 * The current CDN streaming state.
 */
export let DirectCdnStreamingState = /*#__PURE__*/function (DirectCdnStreamingState) {
  DirectCdnStreamingState[DirectCdnStreamingState["DirectCdnStreamingStateIdle"] = 0] = "DirectCdnStreamingStateIdle";
  DirectCdnStreamingState[DirectCdnStreamingState["DirectCdnStreamingStateRunning"] = 1] = "DirectCdnStreamingStateRunning";
  DirectCdnStreamingState[DirectCdnStreamingState["DirectCdnStreamingStateStopped"] = 2] = "DirectCdnStreamingStateStopped";
  DirectCdnStreamingState[DirectCdnStreamingState["DirectCdnStreamingStateFailed"] = 3] = "DirectCdnStreamingStateFailed";
  DirectCdnStreamingState[DirectCdnStreamingState["DirectCdnStreamingStateRecovering"] = 4] = "DirectCdnStreamingStateRecovering";
  return DirectCdnStreamingState;
}({});

/**
 * The statistics of the current CDN streaming.
 */
export class DirectCdnStreamingStats {}

/**
 * The IDirectCdnStreamingEventHandler interface class is used by the SDK to send event notifications of CDN streaming to your app. Your app can get those notifications through methods that inherit this interface class.
 */

/**
 * The media setting options for the host.
 */
export class DirectCdnStreamingMediaOptions {}

/**
 * @ignore
 */
export class ExtensionInfo {}

/**
 * The basic interface of the Agora SDK that implements the core functions of real-time communication.
 *
 * IRtcEngine provides the main methods that your app can call. Before calling other APIs, you must call createAgoraRtcEngine to create an IRtcEngine object.
 */
export class IRtcEngine {}

/**
 * @ignore
 */
export let QualityReportFormatType = /*#__PURE__*/function (QualityReportFormatType) {
  QualityReportFormatType[QualityReportFormatType["QualityReportJson"] = 0] = "QualityReportJson";
  QualityReportFormatType[QualityReportFormatType["QualityReportHtml"] = 1] = "QualityReportHtml";
  return QualityReportFormatType;
}({});

/**
 * Media device states.
 */
export let MediaDeviceStateType = /*#__PURE__*/function (MediaDeviceStateType) {
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStateIdle"] = 0] = "MediaDeviceStateIdle";
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStateActive"] = 1] = "MediaDeviceStateActive";
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStateDisabled"] = 2] = "MediaDeviceStateDisabled";
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStatePluggedIn"] = 3] = "MediaDeviceStatePluggedIn";
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStateNotPresent"] = 4] = "MediaDeviceStateNotPresent";
  MediaDeviceStateType[MediaDeviceStateType["MediaDeviceStateUnplugged"] = 8] = "MediaDeviceStateUnplugged";
  return MediaDeviceStateType;
}({});

/**
 * @ignore
 */
export let VideoProfileType = /*#__PURE__*/function (VideoProfileType) {
  VideoProfileType[VideoProfileType["VideoProfileLandscape120p"] = 0] = "VideoProfileLandscape120p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape120p3"] = 2] = "VideoProfileLandscape120p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape180p"] = 10] = "VideoProfileLandscape180p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape180p3"] = 12] = "VideoProfileLandscape180p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape180p4"] = 13] = "VideoProfileLandscape180p4";
  VideoProfileType[VideoProfileType["VideoProfileLandscape240p"] = 20] = "VideoProfileLandscape240p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape240p3"] = 22] = "VideoProfileLandscape240p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape240p4"] = 23] = "VideoProfileLandscape240p4";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p"] = 30] = "VideoProfileLandscape360p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p3"] = 32] = "VideoProfileLandscape360p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p4"] = 33] = "VideoProfileLandscape360p4";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p6"] = 35] = "VideoProfileLandscape360p6";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p7"] = 36] = "VideoProfileLandscape360p7";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p8"] = 37] = "VideoProfileLandscape360p8";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p9"] = 38] = "VideoProfileLandscape360p9";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p10"] = 39] = "VideoProfileLandscape360p10";
  VideoProfileType[VideoProfileType["VideoProfileLandscape360p11"] = 100] = "VideoProfileLandscape360p11";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p"] = 40] = "VideoProfileLandscape480p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p3"] = 42] = "VideoProfileLandscape480p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p4"] = 43] = "VideoProfileLandscape480p4";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p6"] = 45] = "VideoProfileLandscape480p6";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p8"] = 47] = "VideoProfileLandscape480p8";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p9"] = 48] = "VideoProfileLandscape480p9";
  VideoProfileType[VideoProfileType["VideoProfileLandscape480p10"] = 49] = "VideoProfileLandscape480p10";
  VideoProfileType[VideoProfileType["VideoProfileLandscape720p"] = 50] = "VideoProfileLandscape720p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape720p3"] = 52] = "VideoProfileLandscape720p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape720p5"] = 54] = "VideoProfileLandscape720p5";
  VideoProfileType[VideoProfileType["VideoProfileLandscape720p6"] = 55] = "VideoProfileLandscape720p6";
  VideoProfileType[VideoProfileType["VideoProfileLandscape1080p"] = 60] = "VideoProfileLandscape1080p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape1080p3"] = 62] = "VideoProfileLandscape1080p3";
  VideoProfileType[VideoProfileType["VideoProfileLandscape1080p5"] = 64] = "VideoProfileLandscape1080p5";
  VideoProfileType[VideoProfileType["VideoProfileLandscape1440p"] = 66] = "VideoProfileLandscape1440p";
  VideoProfileType[VideoProfileType["VideoProfileLandscape1440p2"] = 67] = "VideoProfileLandscape1440p2";
  VideoProfileType[VideoProfileType["VideoProfileLandscape4k"] = 70] = "VideoProfileLandscape4k";
  VideoProfileType[VideoProfileType["VideoProfileLandscape4k3"] = 72] = "VideoProfileLandscape4k3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait120p"] = 1000] = "VideoProfilePortrait120p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait120p3"] = 1002] = "VideoProfilePortrait120p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait180p"] = 1010] = "VideoProfilePortrait180p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait180p3"] = 1012] = "VideoProfilePortrait180p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait180p4"] = 1013] = "VideoProfilePortrait180p4";
  VideoProfileType[VideoProfileType["VideoProfilePortrait240p"] = 1020] = "VideoProfilePortrait240p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait240p3"] = 1022] = "VideoProfilePortrait240p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait240p4"] = 1023] = "VideoProfilePortrait240p4";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p"] = 1030] = "VideoProfilePortrait360p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p3"] = 1032] = "VideoProfilePortrait360p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p4"] = 1033] = "VideoProfilePortrait360p4";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p6"] = 1035] = "VideoProfilePortrait360p6";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p7"] = 1036] = "VideoProfilePortrait360p7";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p8"] = 1037] = "VideoProfilePortrait360p8";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p9"] = 1038] = "VideoProfilePortrait360p9";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p10"] = 1039] = "VideoProfilePortrait360p10";
  VideoProfileType[VideoProfileType["VideoProfilePortrait360p11"] = 1100] = "VideoProfilePortrait360p11";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p"] = 1040] = "VideoProfilePortrait480p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p3"] = 1042] = "VideoProfilePortrait480p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p4"] = 1043] = "VideoProfilePortrait480p4";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p6"] = 1045] = "VideoProfilePortrait480p6";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p8"] = 1047] = "VideoProfilePortrait480p8";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p9"] = 1048] = "VideoProfilePortrait480p9";
  VideoProfileType[VideoProfileType["VideoProfilePortrait480p10"] = 1049] = "VideoProfilePortrait480p10";
  VideoProfileType[VideoProfileType["VideoProfilePortrait720p"] = 1050] = "VideoProfilePortrait720p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait720p3"] = 1052] = "VideoProfilePortrait720p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait720p5"] = 1054] = "VideoProfilePortrait720p5";
  VideoProfileType[VideoProfileType["VideoProfilePortrait720p6"] = 1055] = "VideoProfilePortrait720p6";
  VideoProfileType[VideoProfileType["VideoProfilePortrait1080p"] = 1060] = "VideoProfilePortrait1080p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait1080p3"] = 1062] = "VideoProfilePortrait1080p3";
  VideoProfileType[VideoProfileType["VideoProfilePortrait1080p5"] = 1064] = "VideoProfilePortrait1080p5";
  VideoProfileType[VideoProfileType["VideoProfilePortrait1440p"] = 1066] = "VideoProfilePortrait1440p";
  VideoProfileType[VideoProfileType["VideoProfilePortrait1440p2"] = 1067] = "VideoProfilePortrait1440p2";
  VideoProfileType[VideoProfileType["VideoProfilePortrait4k"] = 1070] = "VideoProfilePortrait4k";
  VideoProfileType[VideoProfileType["VideoProfilePortrait4k3"] = 1072] = "VideoProfilePortrait4k3";
  VideoProfileType[VideoProfileType["VideoProfileDefault"] = 30] = "VideoProfileDefault";
  return VideoProfileType;
}({});

/**
 * SDK version information.
 */
export class SDKBuildInfo {}

/**
 * The VideoDeviceInfo class that contains the ID and device name of the video devices.
 */
export class VideoDeviceInfo {}

/**
 * The AudioDeviceInfo class that contains the ID, name and type of the audio devices.
 */
export class AudioDeviceInfo {}
//# sourceMappingURL=IAgoraRtcEngine.js.map