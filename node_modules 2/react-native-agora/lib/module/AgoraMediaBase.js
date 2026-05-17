import './extension/AgoraMediaBaseExtension';
/**
 * The context information of the extension.
 */
export class ExtensionContext {}

/**
 * The type of the video source.
 */
export let VideoSourceType = /*#__PURE__*/function (VideoSourceType) {
  VideoSourceType[VideoSourceType["VideoSourceCameraPrimary"] = 0] = "VideoSourceCameraPrimary";
  VideoSourceType[VideoSourceType["VideoSourceCamera"] = 0] = "VideoSourceCamera";
  VideoSourceType[VideoSourceType["VideoSourceCameraSecondary"] = 1] = "VideoSourceCameraSecondary";
  VideoSourceType[VideoSourceType["VideoSourceScreenPrimary"] = 2] = "VideoSourceScreenPrimary";
  VideoSourceType[VideoSourceType["VideoSourceScreen"] = 2] = "VideoSourceScreen";
  VideoSourceType[VideoSourceType["VideoSourceScreenSecondary"] = 3] = "VideoSourceScreenSecondary";
  VideoSourceType[VideoSourceType["VideoSourceCustom"] = 4] = "VideoSourceCustom";
  VideoSourceType[VideoSourceType["VideoSourceMediaPlayer"] = 5] = "VideoSourceMediaPlayer";
  VideoSourceType[VideoSourceType["VideoSourceRtcImagePng"] = 6] = "VideoSourceRtcImagePng";
  VideoSourceType[VideoSourceType["VideoSourceRtcImageJpeg"] = 7] = "VideoSourceRtcImageJpeg";
  VideoSourceType[VideoSourceType["VideoSourceRtcImageGif"] = 8] = "VideoSourceRtcImageGif";
  VideoSourceType[VideoSourceType["VideoSourceRemote"] = 9] = "VideoSourceRemote";
  VideoSourceType[VideoSourceType["VideoSourceTranscoded"] = 10] = "VideoSourceTranscoded";
  VideoSourceType[VideoSourceType["VideoSourceCameraThird"] = 11] = "VideoSourceCameraThird";
  VideoSourceType[VideoSourceType["VideoSourceCameraFourth"] = 12] = "VideoSourceCameraFourth";
  VideoSourceType[VideoSourceType["VideoSourceScreenThird"] = 13] = "VideoSourceScreenThird";
  VideoSourceType[VideoSourceType["VideoSourceScreenFourth"] = 14] = "VideoSourceScreenFourth";
  VideoSourceType[VideoSourceType["VideoSourceSpeechDriven"] = 15] = "VideoSourceSpeechDriven";
  VideoSourceType[VideoSourceType["VideoSourceUnknown"] = 100] = "VideoSourceUnknown";
  return VideoSourceType;
}({});

/**
 * The audio source type.
 */
export let AudioSourceType = /*#__PURE__*/function (AudioSourceType) {
  AudioSourceType[AudioSourceType["AudioSourceMicrophone"] = 0] = "AudioSourceMicrophone";
  AudioSourceType[AudioSourceType["AudioSourceCustom"] = 1] = "AudioSourceCustom";
  AudioSourceType[AudioSourceType["AudioSourceMediaPlayer"] = 2] = "AudioSourceMediaPlayer";
  AudioSourceType[AudioSourceType["AudioSourceLoopbackRecording"] = 3] = "AudioSourceLoopbackRecording";
  AudioSourceType[AudioSourceType["AudioSourceMixedStream"] = 4] = "AudioSourceMixedStream";
  AudioSourceType[AudioSourceType["AudioSourceRemoteUser"] = 5] = "AudioSourceRemoteUser";
  AudioSourceType[AudioSourceType["AudioSourceRemoteChannel"] = 6] = "AudioSourceRemoteChannel";
  AudioSourceType[AudioSourceType["AudioSourceUnknown"] = 100] = "AudioSourceUnknown";
  return AudioSourceType;
}({});

/**
 * The type of the audio route.
 */
export let AudioRoute = /*#__PURE__*/function (AudioRoute) {
  AudioRoute[AudioRoute["RouteDefault"] = -1] = "RouteDefault";
  AudioRoute[AudioRoute["RouteHeadset"] = 0] = "RouteHeadset";
  AudioRoute[AudioRoute["RouteEarpiece"] = 1] = "RouteEarpiece";
  AudioRoute[AudioRoute["RouteHeadsetnomic"] = 2] = "RouteHeadsetnomic";
  AudioRoute[AudioRoute["RouteSpeakerphone"] = 3] = "RouteSpeakerphone";
  AudioRoute[AudioRoute["RouteLoudspeaker"] = 4] = "RouteLoudspeaker";
  AudioRoute[AudioRoute["RouteBluetoothDeviceHfp"] = 5] = "RouteBluetoothDeviceHfp";
  AudioRoute[AudioRoute["RouteUsb"] = 6] = "RouteUsb";
  AudioRoute[AudioRoute["RouteHdmi"] = 7] = "RouteHdmi";
  AudioRoute[AudioRoute["RouteDisplayport"] = 8] = "RouteDisplayport";
  AudioRoute[AudioRoute["RouteAirplay"] = 9] = "RouteAirplay";
  AudioRoute[AudioRoute["RouteBluetoothDeviceA2dp"] = 10] = "RouteBluetoothDeviceA2dp";
  return AudioRoute;
}({});

/**
 * @ignore
 */
export let BytesPerSample = /*#__PURE__*/function (BytesPerSample) {
  BytesPerSample[BytesPerSample["TwoBytesPerSample"] = 2] = "TwoBytesPerSample";
  return BytesPerSample;
}({});

/**
 * @ignore
 */
export class AudioParameters {}

/**
 * The use mode of the audio data.
 */
export let RawAudioFrameOpModeType = /*#__PURE__*/function (RawAudioFrameOpModeType) {
  RawAudioFrameOpModeType[RawAudioFrameOpModeType["RawAudioFrameOpModeReadOnly"] = 0] = "RawAudioFrameOpModeReadOnly";
  RawAudioFrameOpModeType[RawAudioFrameOpModeType["RawAudioFrameOpModeReadWrite"] = 2] = "RawAudioFrameOpModeReadWrite";
  return RawAudioFrameOpModeType;
}({});

/**
 * Media source type.
 */
export let MediaSourceType = /*#__PURE__*/function (MediaSourceType) {
  MediaSourceType[MediaSourceType["AudioPlayoutSource"] = 0] = "AudioPlayoutSource";
  MediaSourceType[MediaSourceType["AudioRecordingSource"] = 1] = "AudioRecordingSource";
  MediaSourceType[MediaSourceType["PrimaryCameraSource"] = 2] = "PrimaryCameraSource";
  MediaSourceType[MediaSourceType["SecondaryCameraSource"] = 3] = "SecondaryCameraSource";
  MediaSourceType[MediaSourceType["PrimaryScreenSource"] = 4] = "PrimaryScreenSource";
  MediaSourceType[MediaSourceType["SecondaryScreenSource"] = 5] = "SecondaryScreenSource";
  MediaSourceType[MediaSourceType["CustomVideoSource"] = 6] = "CustomVideoSource";
  MediaSourceType[MediaSourceType["MediaPlayerSource"] = 7] = "MediaPlayerSource";
  MediaSourceType[MediaSourceType["RtcImagePngSource"] = 8] = "RtcImagePngSource";
  MediaSourceType[MediaSourceType["RtcImageJpegSource"] = 9] = "RtcImageJpegSource";
  MediaSourceType[MediaSourceType["RtcImageGifSource"] = 10] = "RtcImageGifSource";
  MediaSourceType[MediaSourceType["RemoteVideoSource"] = 11] = "RemoteVideoSource";
  MediaSourceType[MediaSourceType["TranscodedVideoSource"] = 12] = "TranscodedVideoSource";
  MediaSourceType[MediaSourceType["SpeechDrivenVideoSource"] = 13] = "SpeechDrivenVideoSource";
  MediaSourceType[MediaSourceType["UnknownMediaSource"] = 100] = "UnknownMediaSource";
  return MediaSourceType;
}({});

/**
 * @ignore
 */
export let ContentInspectResult = /*#__PURE__*/function (ContentInspectResult) {
  ContentInspectResult[ContentInspectResult["ContentInspectNeutral"] = 1] = "ContentInspectNeutral";
  ContentInspectResult[ContentInspectResult["ContentInspectSexy"] = 2] = "ContentInspectSexy";
  ContentInspectResult[ContentInspectResult["ContentInspectPorn"] = 3] = "ContentInspectPorn";
  return ContentInspectResult;
}({});

/**
 * The type of video content moderation module.
 */
export let ContentInspectType = /*#__PURE__*/function (ContentInspectType) {
  ContentInspectType[ContentInspectType["ContentInspectInvalid"] = 0] = "ContentInspectInvalid";
  ContentInspectType[ContentInspectType["ContentInspectModeration"] = 1] = "ContentInspectModeration";
  ContentInspectType[ContentInspectType["ContentInspectSupervision"] = 2] = "ContentInspectSupervision";
  ContentInspectType[ContentInspectType["ContentInspectImageModeration"] = 3] = "ContentInspectImageModeration";
  return ContentInspectType;
}({});

/**
 * ContentInspectModule A structure used to configure the frequency of video screenshot and upload.
 */
export class ContentInspectModule {}

/**
 * Screenshot and upload configuration.
 */
export class ContentInspectConfig {}

/**
 * @ignore
 */
export class PacketOptions {}

/**
 * @ignore
 */
export class AudioEncodedFrameInfo {}

/**
 * The parameters of the audio frame in PCM format.
 */
export class AudioPcmFrame {}

/**
 * The channel mode.
 */
export let AudioDualMonoMode = /*#__PURE__*/function (AudioDualMonoMode) {
  AudioDualMonoMode[AudioDualMonoMode["AudioDualMonoStereo"] = 0] = "AudioDualMonoStereo";
  AudioDualMonoMode[AudioDualMonoMode["AudioDualMonoL"] = 1] = "AudioDualMonoL";
  AudioDualMonoMode[AudioDualMonoMode["AudioDualMonoR"] = 2] = "AudioDualMonoR";
  AudioDualMonoMode[AudioDualMonoMode["AudioDualMonoMix"] = 3] = "AudioDualMonoMix";
  return AudioDualMonoMode;
}({});

/**
 * The video pixel format.
 */
export let VideoPixelFormat = /*#__PURE__*/function (VideoPixelFormat) {
  VideoPixelFormat[VideoPixelFormat["VideoPixelDefault"] = 0] = "VideoPixelDefault";
  VideoPixelFormat[VideoPixelFormat["VideoPixelI420"] = 1] = "VideoPixelI420";
  VideoPixelFormat[VideoPixelFormat["VideoPixelBgra"] = 2] = "VideoPixelBgra";
  VideoPixelFormat[VideoPixelFormat["VideoPixelNv21"] = 3] = "VideoPixelNv21";
  VideoPixelFormat[VideoPixelFormat["VideoPixelRgba"] = 4] = "VideoPixelRgba";
  VideoPixelFormat[VideoPixelFormat["VideoPixelNv12"] = 8] = "VideoPixelNv12";
  VideoPixelFormat[VideoPixelFormat["VideoTexture2d"] = 10] = "VideoTexture2d";
  VideoPixelFormat[VideoPixelFormat["VideoTextureOes"] = 11] = "VideoTextureOes";
  VideoPixelFormat[VideoPixelFormat["VideoCvpixelNv12"] = 12] = "VideoCvpixelNv12";
  VideoPixelFormat[VideoPixelFormat["VideoCvpixelI420"] = 13] = "VideoCvpixelI420";
  VideoPixelFormat[VideoPixelFormat["VideoCvpixelBgra"] = 14] = "VideoCvpixelBgra";
  VideoPixelFormat[VideoPixelFormat["VideoCvpixelP010"] = 15] = "VideoCvpixelP010";
  VideoPixelFormat[VideoPixelFormat["VideoPixelI422"] = 16] = "VideoPixelI422";
  VideoPixelFormat[VideoPixelFormat["VideoTextureId3d11texture2d"] = 17] = "VideoTextureId3d11texture2d";
  VideoPixelFormat[VideoPixelFormat["VideoPixelI010"] = 18] = "VideoPixelI010";
  return VideoPixelFormat;
}({});

/**
 * Video display modes.
 */
export let RenderModeType = /*#__PURE__*/function (RenderModeType) {
  RenderModeType[RenderModeType["RenderModeHidden"] = 1] = "RenderModeHidden";
  RenderModeType[RenderModeType["RenderModeFit"] = 2] = "RenderModeFit";
  RenderModeType[RenderModeType["RenderModeAdaptive"] = 3] = "RenderModeAdaptive";
  return RenderModeType;
}({});

/**
 * @ignore
 */
export let CameraVideoSourceType = /*#__PURE__*/function (CameraVideoSourceType) {
  CameraVideoSourceType[CameraVideoSourceType["CameraSourceFront"] = 0] = "CameraSourceFront";
  CameraVideoSourceType[CameraVideoSourceType["CameraSourceBack"] = 1] = "CameraSourceBack";
  CameraVideoSourceType[CameraVideoSourceType["VideoSourceUnspecified"] = 2] = "VideoSourceUnspecified";
  return CameraVideoSourceType;
}({});

/**
 * @ignore
 */
export let MetaInfoKey = /*#__PURE__*/function (MetaInfoKey) {
  MetaInfoKey[MetaInfoKey["KeyFaceCapture"] = 0] = "KeyFaceCapture";
  return MetaInfoKey;
}({});

/**
 * @ignore
 */
export class IVideoFrameMetaInfo {}

/**
 * @ignore
 */
export let PrimaryID = /*#__PURE__*/function (PrimaryID) {
  PrimaryID[PrimaryID["PrimaryidBt709"] = 1] = "PrimaryidBt709";
  PrimaryID[PrimaryID["PrimaryidUnspecified"] = 2] = "PrimaryidUnspecified";
  PrimaryID[PrimaryID["PrimaryidBt470m"] = 4] = "PrimaryidBt470m";
  PrimaryID[PrimaryID["PrimaryidBt470bg"] = 5] = "PrimaryidBt470bg";
  PrimaryID[PrimaryID["PrimaryidSmpte170m"] = 6] = "PrimaryidSmpte170m";
  PrimaryID[PrimaryID["PrimaryidSmpte240m"] = 7] = "PrimaryidSmpte240m";
  PrimaryID[PrimaryID["PrimaryidFilm"] = 8] = "PrimaryidFilm";
  PrimaryID[PrimaryID["PrimaryidBt2020"] = 9] = "PrimaryidBt2020";
  PrimaryID[PrimaryID["PrimaryidSmptest428"] = 10] = "PrimaryidSmptest428";
  PrimaryID[PrimaryID["PrimaryidSmptest431"] = 11] = "PrimaryidSmptest431";
  PrimaryID[PrimaryID["PrimaryidSmptest432"] = 12] = "PrimaryidSmptest432";
  PrimaryID[PrimaryID["PrimaryidJedecp22"] = 22] = "PrimaryidJedecp22";
  return PrimaryID;
}({});

/**
 * @ignore
 */
export let RangeID = /*#__PURE__*/function (RangeID) {
  RangeID[RangeID["RangeidInvalid"] = 0] = "RangeidInvalid";
  RangeID[RangeID["RangeidLimited"] = 1] = "RangeidLimited";
  RangeID[RangeID["RangeidFull"] = 2] = "RangeidFull";
  RangeID[RangeID["RangeidDerived"] = 3] = "RangeidDerived";
  return RangeID;
}({});

/**
 * @ignore
 */
export let MatrixID = /*#__PURE__*/function (MatrixID) {
  MatrixID[MatrixID["MatrixidRgb"] = 0] = "MatrixidRgb";
  MatrixID[MatrixID["MatrixidBt709"] = 1] = "MatrixidBt709";
  MatrixID[MatrixID["MatrixidUnspecified"] = 2] = "MatrixidUnspecified";
  MatrixID[MatrixID["MatrixidFcc"] = 4] = "MatrixidFcc";
  MatrixID[MatrixID["MatrixidBt470bg"] = 5] = "MatrixidBt470bg";
  MatrixID[MatrixID["MatrixidSmpte170m"] = 6] = "MatrixidSmpte170m";
  MatrixID[MatrixID["MatrixidSmpte240m"] = 7] = "MatrixidSmpte240m";
  MatrixID[MatrixID["MatrixidYcocg"] = 8] = "MatrixidYcocg";
  MatrixID[MatrixID["MatrixidBt2020Ncl"] = 9] = "MatrixidBt2020Ncl";
  MatrixID[MatrixID["MatrixidBt2020Cl"] = 10] = "MatrixidBt2020Cl";
  MatrixID[MatrixID["MatrixidSmpte2085"] = 11] = "MatrixidSmpte2085";
  MatrixID[MatrixID["MatrixidCdncls"] = 12] = "MatrixidCdncls";
  MatrixID[MatrixID["MatrixidCdcls"] = 13] = "MatrixidCdcls";
  MatrixID[MatrixID["MatrixidBt2100Ictcp"] = 14] = "MatrixidBt2100Ictcp";
  return MatrixID;
}({});

/**
 * @ignore
 */
export let TransferID = /*#__PURE__*/function (TransferID) {
  TransferID[TransferID["TransferidBt709"] = 1] = "TransferidBt709";
  TransferID[TransferID["TransferidUnspecified"] = 2] = "TransferidUnspecified";
  TransferID[TransferID["TransferidGamma22"] = 4] = "TransferidGamma22";
  TransferID[TransferID["TransferidGamma28"] = 5] = "TransferidGamma28";
  TransferID[TransferID["TransferidSmpte170m"] = 6] = "TransferidSmpte170m";
  TransferID[TransferID["TransferidSmpte240m"] = 7] = "TransferidSmpte240m";
  TransferID[TransferID["TransferidLinear"] = 8] = "TransferidLinear";
  TransferID[TransferID["TransferidLog"] = 9] = "TransferidLog";
  TransferID[TransferID["TransferidLogSqrt"] = 10] = "TransferidLogSqrt";
  TransferID[TransferID["TransferidIec6196624"] = 11] = "TransferidIec6196624";
  TransferID[TransferID["TransferidBt1361Ecg"] = 12] = "TransferidBt1361Ecg";
  TransferID[TransferID["TransferidIec6196621"] = 13] = "TransferidIec6196621";
  TransferID[TransferID["TransferidBt202010"] = 14] = "TransferidBt202010";
  TransferID[TransferID["TransferidBt202012"] = 15] = "TransferidBt202012";
  TransferID[TransferID["TransferidSmptest2084"] = 16] = "TransferidSmptest2084";
  TransferID[TransferID["TransferidSmptest428"] = 17] = "TransferidSmptest428";
  TransferID[TransferID["TransferidAribStdB67"] = 18] = "TransferidAribStdB67";
  return TransferID;
}({});

/**
 * @ignore
 */
export class ColorSpace {}

/**
 * @ignore
 */
export class Hdr10MetadataInfo {}

/**
 * The relative position of alphaBuffer and video frames.
 */
export let AlphaStitchMode = /*#__PURE__*/function (AlphaStitchMode) {
  AlphaStitchMode[AlphaStitchMode["NoAlphaStitch"] = 0] = "NoAlphaStitch";
  AlphaStitchMode[AlphaStitchMode["AlphaStitchUp"] = 1] = "AlphaStitchUp";
  AlphaStitchMode[AlphaStitchMode["AlphaStitchBelow"] = 2] = "AlphaStitchBelow";
  AlphaStitchMode[AlphaStitchMode["AlphaStitchLeft"] = 3] = "AlphaStitchLeft";
  AlphaStitchMode[AlphaStitchMode["AlphaStitchRight"] = 4] = "AlphaStitchRight";
  return AlphaStitchMode;
}({});

/**
 * @ignore
 */
export let EglContextType = /*#__PURE__*/function (EglContextType) {
  EglContextType[EglContextType["EglContext10"] = 0] = "EglContext10";
  EglContextType[EglContextType["EglContext14"] = 1] = "EglContext14";
  return EglContextType;
}({});

/**
 * The video buffer type.
 */
export let VideoBufferType = /*#__PURE__*/function (VideoBufferType) {
  VideoBufferType[VideoBufferType["VideoBufferRawData"] = 1] = "VideoBufferRawData";
  VideoBufferType[VideoBufferType["VideoBufferArray"] = 2] = "VideoBufferArray";
  VideoBufferType[VideoBufferType["VideoBufferTexture"] = 3] = "VideoBufferTexture";
  return VideoBufferType;
}({});

/**
 * The external video frame.
 */
export class ExternalVideoFrame {}

/**
 * Configurations of the video frame.
 *
 * Note that the buffer provides a pointer to a pointer. This interface cannot modify the pointer of the buffer, but it can modify the content of the buffer.
 */
export class VideoFrame {}

/**
 * @ignore
 */
export let MediaPlayerSourceType = /*#__PURE__*/function (MediaPlayerSourceType) {
  MediaPlayerSourceType[MediaPlayerSourceType["MediaPlayerSourceDefault"] = 0] = "MediaPlayerSourceDefault";
  MediaPlayerSourceType[MediaPlayerSourceType["MediaPlayerSourceFullFeatured"] = 1] = "MediaPlayerSourceFullFeatured";
  MediaPlayerSourceType[MediaPlayerSourceType["MediaPlayerSourceSimple"] = 2] = "MediaPlayerSourceSimple";
  return MediaPlayerSourceType;
}({});

/**
 * The frame position of the video observer.
 */
export let VideoModulePosition = /*#__PURE__*/function (VideoModulePosition) {
  VideoModulePosition[VideoModulePosition["PositionPostCapturer"] = 1] = "PositionPostCapturer";
  VideoModulePosition[VideoModulePosition["PositionPreRenderer"] = 2] = "PositionPreRenderer";
  VideoModulePosition[VideoModulePosition["PositionPreEncoder"] = 4] = "PositionPreEncoder";
  VideoModulePosition[VideoModulePosition["PositionPostCapturerOrigin"] = 8] = "PositionPostCapturerOrigin";
  return VideoModulePosition;
}({});

/**
 * The snapshot configuration.
 */
export class SnapshotConfig {}

/**
 * This class is used to get raw PCM audio.
 *
 * You can inherit this class and implement the onFrame callback to get raw PCM audio.
 */

/**
 * Audio frame type.
 */
export let AudioFrameType = /*#__PURE__*/function (AudioFrameType) {
  AudioFrameType[AudioFrameType["FrameTypePcm16"] = 0] = "FrameTypePcm16";
  return AudioFrameType;
}({});

/**
 * Raw audio data.
 */
export class AudioFrame {}

/**
 * @ignore
 */
export let AudioFramePosition = /*#__PURE__*/function (AudioFramePosition) {
  AudioFramePosition[AudioFramePosition["AudioFramePositionNone"] = 0] = "AudioFramePositionNone";
  AudioFramePosition[AudioFramePosition["AudioFramePositionPlayback"] = 1] = "AudioFramePositionPlayback";
  AudioFramePosition[AudioFramePosition["AudioFramePositionRecord"] = 2] = "AudioFramePositionRecord";
  AudioFramePosition[AudioFramePosition["AudioFramePositionMixed"] = 4] = "AudioFramePositionMixed";
  AudioFramePosition[AudioFramePosition["AudioFramePositionBeforeMixing"] = 8] = "AudioFramePositionBeforeMixing";
  AudioFramePosition[AudioFramePosition["AudioFramePositionEarMonitoring"] = 16] = "AudioFramePositionEarMonitoring";
  return AudioFramePosition;
}({});

/**
 * Audio data format.
 *
 * The SDK sets the audio data format in the following callbacks according to AudioParams. onRecordAudioFrame onPlaybackAudioFrame onMixedAudioFrame
 *  The SDK calculates the sampling interval through the samplesPerCall, sampleRate, and channel parameters in AudioParams, and triggers the onRecordAudioFrame, onPlaybackAudioFrame, onMixedAudioFrame, and onEarMonitoringAudioFrame callbacks according to the sampling interval. Sample interval (sec) = samplePerCall /(sampleRate × channel).
 *  Ensure that the sample interval ≥ 0.01 (s).
 */
export class AudioParams {}

/**
 * The audio frame observer.
 */

/**
 * The audio spectrum data.
 */
export class AudioSpectrumData {}

/**
 * Audio spectrum information of the remote user.
 */
export class UserAudioSpectrumInfo {}

/**
 * The audio spectrum observer.
 */

/**
 * The process mode of the video frame:
 */
export let VideoFrameProcessMode = /*#__PURE__*/function (VideoFrameProcessMode) {
  VideoFrameProcessMode[VideoFrameProcessMode["ProcessModeReadOnly"] = 0] = "ProcessModeReadOnly";
  VideoFrameProcessMode[VideoFrameProcessMode["ProcessModeReadWrite"] = 1] = "ProcessModeReadWrite";
  return VideoFrameProcessMode;
}({});

/**
 * The IVideoFrameObserver class.
 */

/**
 * The external video frame encoding type.
 */
export let ExternalVideoSourceType = /*#__PURE__*/function (ExternalVideoSourceType) {
  ExternalVideoSourceType[ExternalVideoSourceType["VideoFrame"] = 0] = "VideoFrame";
  ExternalVideoSourceType[ExternalVideoSourceType["EncodedVideoFrame"] = 1] = "EncodedVideoFrame";
  return ExternalVideoSourceType;
}({});

/**
 * @ignore
 */
export let MediaRecorderContainerFormat = /*#__PURE__*/function (MediaRecorderContainerFormat) {
  MediaRecorderContainerFormat[MediaRecorderContainerFormat["FormatMp4"] = 1] = "FormatMp4";
  return MediaRecorderContainerFormat;
}({});

/**
 * The recording content.
 */
export let MediaRecorderStreamType = /*#__PURE__*/function (MediaRecorderStreamType) {
  MediaRecorderStreamType[MediaRecorderStreamType["StreamTypeAudio"] = 1] = "StreamTypeAudio";
  MediaRecorderStreamType[MediaRecorderStreamType["StreamTypeVideo"] = 2] = "StreamTypeVideo";
  MediaRecorderStreamType[MediaRecorderStreamType["StreamTypeBoth"] = 3] = "StreamTypeBoth";
  return MediaRecorderStreamType;
}({});

/**
 * The current recording state.
 */
export let RecorderState = /*#__PURE__*/function (RecorderState) {
  RecorderState[RecorderState["RecorderStateError"] = -1] = "RecorderStateError";
  RecorderState[RecorderState["RecorderStateStart"] = 2] = "RecorderStateStart";
  RecorderState[RecorderState["RecorderStateStop"] = 3] = "RecorderStateStop";
  return RecorderState;
}({});

/**
 * The reason for the state change.
 */
export let RecorderReasonCode = /*#__PURE__*/function (RecorderReasonCode) {
  RecorderReasonCode[RecorderReasonCode["RecorderReasonNone"] = 0] = "RecorderReasonNone";
  RecorderReasonCode[RecorderReasonCode["RecorderReasonWriteFailed"] = 1] = "RecorderReasonWriteFailed";
  RecorderReasonCode[RecorderReasonCode["RecorderReasonNoStream"] = 2] = "RecorderReasonNoStream";
  RecorderReasonCode[RecorderReasonCode["RecorderReasonOverMaxDuration"] = 3] = "RecorderReasonOverMaxDuration";
  RecorderReasonCode[RecorderReasonCode["RecorderReasonConfigChanged"] = 4] = "RecorderReasonConfigChanged";
  return RecorderReasonCode;
}({});

/**
 * @ignore
 */
export class MediaRecorderConfiguration {}

/**
 * Facial information observer.
 *
 * You can call registerFaceInfoObserver to register one IFaceInfoObserver observer.
 */

/**
 * @ignore
 */
export class RecorderInfo {}

/**
 * @ignore
 */
//# sourceMappingURL=AgoraMediaBase.js.map