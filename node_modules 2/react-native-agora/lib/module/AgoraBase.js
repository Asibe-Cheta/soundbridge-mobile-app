import './extension/AgoraBaseExtension';
/**
 * The channel profile.
 */
export let ChannelProfileType = /*#__PURE__*/function (ChannelProfileType) {
  ChannelProfileType[ChannelProfileType["ChannelProfileCommunication"] = 0] = "ChannelProfileCommunication";
  ChannelProfileType[ChannelProfileType["ChannelProfileLiveBroadcasting"] = 1] = "ChannelProfileLiveBroadcasting";
  ChannelProfileType[ChannelProfileType["ChannelProfileGame"] = 2] = "ChannelProfileGame";
  ChannelProfileType[ChannelProfileType["ChannelProfileCloudGaming"] = 3] = "ChannelProfileCloudGaming";
  ChannelProfileType[ChannelProfileType["ChannelProfileCommunication1v1"] = 4] = "ChannelProfileCommunication1v1";
  return ChannelProfileType;
}({});

/**
 * @ignore
 */
export let WarnCodeType = /*#__PURE__*/function (WarnCodeType) {
  WarnCodeType[WarnCodeType["WarnInvalidView"] = 8] = "WarnInvalidView";
  WarnCodeType[WarnCodeType["WarnInitVideo"] = 16] = "WarnInitVideo";
  WarnCodeType[WarnCodeType["WarnPending"] = 20] = "WarnPending";
  WarnCodeType[WarnCodeType["WarnNoAvailableChannel"] = 103] = "WarnNoAvailableChannel";
  WarnCodeType[WarnCodeType["WarnLookupChannelTimeout"] = 104] = "WarnLookupChannelTimeout";
  WarnCodeType[WarnCodeType["WarnLookupChannelRejected"] = 105] = "WarnLookupChannelRejected";
  WarnCodeType[WarnCodeType["WarnOpenChannelTimeout"] = 106] = "WarnOpenChannelTimeout";
  WarnCodeType[WarnCodeType["WarnOpenChannelRejected"] = 107] = "WarnOpenChannelRejected";
  WarnCodeType[WarnCodeType["WarnSwitchLiveVideoTimeout"] = 111] = "WarnSwitchLiveVideoTimeout";
  WarnCodeType[WarnCodeType["WarnSetClientRoleTimeout"] = 118] = "WarnSetClientRoleTimeout";
  WarnCodeType[WarnCodeType["WarnOpenChannelInvalidTicket"] = 121] = "WarnOpenChannelInvalidTicket";
  WarnCodeType[WarnCodeType["WarnOpenChannelTryNextVos"] = 122] = "WarnOpenChannelTryNextVos";
  WarnCodeType[WarnCodeType["WarnChannelConnectionUnrecoverable"] = 131] = "WarnChannelConnectionUnrecoverable";
  WarnCodeType[WarnCodeType["WarnChannelConnectionIpChanged"] = 132] = "WarnChannelConnectionIpChanged";
  WarnCodeType[WarnCodeType["WarnChannelConnectionPortChanged"] = 133] = "WarnChannelConnectionPortChanged";
  WarnCodeType[WarnCodeType["WarnChannelSocketError"] = 134] = "WarnChannelSocketError";
  WarnCodeType[WarnCodeType["WarnAudioMixingOpenError"] = 701] = "WarnAudioMixingOpenError";
  WarnCodeType[WarnCodeType["WarnAdmRuntimePlayoutWarning"] = 1014] = "WarnAdmRuntimePlayoutWarning";
  WarnCodeType[WarnCodeType["WarnAdmRuntimeRecordingWarning"] = 1016] = "WarnAdmRuntimeRecordingWarning";
  WarnCodeType[WarnCodeType["WarnAdmRecordAudioSilence"] = 1019] = "WarnAdmRecordAudioSilence";
  WarnCodeType[WarnCodeType["WarnAdmPlayoutMalfunction"] = 1020] = "WarnAdmPlayoutMalfunction";
  WarnCodeType[WarnCodeType["WarnAdmRecordMalfunction"] = 1021] = "WarnAdmRecordMalfunction";
  WarnCodeType[WarnCodeType["WarnAdmRecordAudioLowlevel"] = 1031] = "WarnAdmRecordAudioLowlevel";
  WarnCodeType[WarnCodeType["WarnAdmPlayoutAudioLowlevel"] = 1032] = "WarnAdmPlayoutAudioLowlevel";
  WarnCodeType[WarnCodeType["WarnAdmWindowsNoDataReadyEvent"] = 1040] = "WarnAdmWindowsNoDataReadyEvent";
  WarnCodeType[WarnCodeType["WarnApmHowling"] = 1051] = "WarnApmHowling";
  WarnCodeType[WarnCodeType["WarnAdmGlitchState"] = 1052] = "WarnAdmGlitchState";
  WarnCodeType[WarnCodeType["WarnAdmImproperSettings"] = 1053] = "WarnAdmImproperSettings";
  WarnCodeType[WarnCodeType["WarnAdmPopState"] = 1055] = "WarnAdmPopState";
  WarnCodeType[WarnCodeType["WarnAdmWinCoreNoRecordingDevice"] = 1322] = "WarnAdmWinCoreNoRecordingDevice";
  WarnCodeType[WarnCodeType["WarnAdmWinCoreNoPlayoutDevice"] = 1323] = "WarnAdmWinCoreNoPlayoutDevice";
  WarnCodeType[WarnCodeType["WarnAdmWinCoreImproperCaptureRelease"] = 1324] = "WarnAdmWinCoreImproperCaptureRelease";
  return WarnCodeType;
}({});

/**
 * Error codes.
 *
 * An error code indicates that the SDK encountered an unrecoverable error that requires application intervention. For example, an error is returned when the camera fails to open, and the app needs to inform the user that the camera cannot be used.
 */
export let ErrorCodeType = /*#__PURE__*/function (ErrorCodeType) {
  ErrorCodeType[ErrorCodeType["ErrOk"] = 0] = "ErrOk";
  ErrorCodeType[ErrorCodeType["ErrFailed"] = 1] = "ErrFailed";
  ErrorCodeType[ErrorCodeType["ErrInvalidArgument"] = 2] = "ErrInvalidArgument";
  ErrorCodeType[ErrorCodeType["ErrNotReady"] = 3] = "ErrNotReady";
  ErrorCodeType[ErrorCodeType["ErrNotSupported"] = 4] = "ErrNotSupported";
  ErrorCodeType[ErrorCodeType["ErrRefused"] = 5] = "ErrRefused";
  ErrorCodeType[ErrorCodeType["ErrBufferTooSmall"] = 6] = "ErrBufferTooSmall";
  ErrorCodeType[ErrorCodeType["ErrNotInitialized"] = 7] = "ErrNotInitialized";
  ErrorCodeType[ErrorCodeType["ErrInvalidState"] = 8] = "ErrInvalidState";
  ErrorCodeType[ErrorCodeType["ErrNoPermission"] = 9] = "ErrNoPermission";
  ErrorCodeType[ErrorCodeType["ErrTimedout"] = 10] = "ErrTimedout";
  ErrorCodeType[ErrorCodeType["ErrCanceled"] = 11] = "ErrCanceled";
  ErrorCodeType[ErrorCodeType["ErrTooOften"] = 12] = "ErrTooOften";
  ErrorCodeType[ErrorCodeType["ErrBindSocket"] = 13] = "ErrBindSocket";
  ErrorCodeType[ErrorCodeType["ErrNetDown"] = 14] = "ErrNetDown";
  ErrorCodeType[ErrorCodeType["ErrJoinChannelRejected"] = 17] = "ErrJoinChannelRejected";
  ErrorCodeType[ErrorCodeType["ErrLeaveChannelRejected"] = 18] = "ErrLeaveChannelRejected";
  ErrorCodeType[ErrorCodeType["ErrAlreadyInUse"] = 19] = "ErrAlreadyInUse";
  ErrorCodeType[ErrorCodeType["ErrAborted"] = 20] = "ErrAborted";
  ErrorCodeType[ErrorCodeType["ErrInitNetEngine"] = 21] = "ErrInitNetEngine";
  ErrorCodeType[ErrorCodeType["ErrResourceLimited"] = 22] = "ErrResourceLimited";
  ErrorCodeType[ErrorCodeType["ErrInvalidAppId"] = 101] = "ErrInvalidAppId";
  ErrorCodeType[ErrorCodeType["ErrInvalidChannelName"] = 102] = "ErrInvalidChannelName";
  ErrorCodeType[ErrorCodeType["ErrNoServerResources"] = 103] = "ErrNoServerResources";
  ErrorCodeType[ErrorCodeType["ErrTokenExpired"] = 109] = "ErrTokenExpired";
  ErrorCodeType[ErrorCodeType["ErrInvalidToken"] = 110] = "ErrInvalidToken";
  ErrorCodeType[ErrorCodeType["ErrConnectionInterrupted"] = 111] = "ErrConnectionInterrupted";
  ErrorCodeType[ErrorCodeType["ErrConnectionLost"] = 112] = "ErrConnectionLost";
  ErrorCodeType[ErrorCodeType["ErrNotInChannel"] = 113] = "ErrNotInChannel";
  ErrorCodeType[ErrorCodeType["ErrSizeTooLarge"] = 114] = "ErrSizeTooLarge";
  ErrorCodeType[ErrorCodeType["ErrBitrateLimit"] = 115] = "ErrBitrateLimit";
  ErrorCodeType[ErrorCodeType["ErrTooManyDataStreams"] = 116] = "ErrTooManyDataStreams";
  ErrorCodeType[ErrorCodeType["ErrStreamMessageTimeout"] = 117] = "ErrStreamMessageTimeout";
  ErrorCodeType[ErrorCodeType["ErrSetClientRoleNotAuthorized"] = 119] = "ErrSetClientRoleNotAuthorized";
  ErrorCodeType[ErrorCodeType["ErrDecryptionFailed"] = 120] = "ErrDecryptionFailed";
  ErrorCodeType[ErrorCodeType["ErrInvalidUserId"] = 121] = "ErrInvalidUserId";
  ErrorCodeType[ErrorCodeType["ErrDatastreamDecryptionFailed"] = 122] = "ErrDatastreamDecryptionFailed";
  ErrorCodeType[ErrorCodeType["ErrClientIsBannedByServer"] = 123] = "ErrClientIsBannedByServer";
  ErrorCodeType[ErrorCodeType["ErrEncryptedStreamNotAllowedPublish"] = 130] = "ErrEncryptedStreamNotAllowedPublish";
  ErrorCodeType[ErrorCodeType["ErrLicenseCredentialInvalid"] = 131] = "ErrLicenseCredentialInvalid";
  ErrorCodeType[ErrorCodeType["ErrInvalidUserAccount"] = 134] = "ErrInvalidUserAccount";
  ErrorCodeType[ErrorCodeType["ErrModuleNotFound"] = 157] = "ErrModuleNotFound";
  ErrorCodeType[ErrorCodeType["ErrCertRaw"] = 157] = "ErrCertRaw";
  ErrorCodeType[ErrorCodeType["ErrCertJsonPart"] = 158] = "ErrCertJsonPart";
  ErrorCodeType[ErrorCodeType["ErrCertJsonInval"] = 159] = "ErrCertJsonInval";
  ErrorCodeType[ErrorCodeType["ErrCertJsonNomem"] = 160] = "ErrCertJsonNomem";
  ErrorCodeType[ErrorCodeType["ErrCertCustom"] = 161] = "ErrCertCustom";
  ErrorCodeType[ErrorCodeType["ErrCertCredential"] = 162] = "ErrCertCredential";
  ErrorCodeType[ErrorCodeType["ErrCertSign"] = 163] = "ErrCertSign";
  ErrorCodeType[ErrorCodeType["ErrCertFail"] = 164] = "ErrCertFail";
  ErrorCodeType[ErrorCodeType["ErrCertBuf"] = 165] = "ErrCertBuf";
  ErrorCodeType[ErrorCodeType["ErrCertNull"] = 166] = "ErrCertNull";
  ErrorCodeType[ErrorCodeType["ErrCertDuedate"] = 167] = "ErrCertDuedate";
  ErrorCodeType[ErrorCodeType["ErrCertRequest"] = 168] = "ErrCertRequest";
  ErrorCodeType[ErrorCodeType["ErrPcmsendFormat"] = 200] = "ErrPcmsendFormat";
  ErrorCodeType[ErrorCodeType["ErrPcmsendBufferoverflow"] = 201] = "ErrPcmsendBufferoverflow";
  ErrorCodeType[ErrorCodeType["ErrLoginAlreadyLogin"] = 428] = "ErrLoginAlreadyLogin";
  ErrorCodeType[ErrorCodeType["ErrLoadMediaEngine"] = 1001] = "ErrLoadMediaEngine";
  ErrorCodeType[ErrorCodeType["ErrAdmGeneralError"] = 1005] = "ErrAdmGeneralError";
  ErrorCodeType[ErrorCodeType["ErrAdmInitPlayout"] = 1008] = "ErrAdmInitPlayout";
  ErrorCodeType[ErrorCodeType["ErrAdmStartPlayout"] = 1009] = "ErrAdmStartPlayout";
  ErrorCodeType[ErrorCodeType["ErrAdmStopPlayout"] = 1010] = "ErrAdmStopPlayout";
  ErrorCodeType[ErrorCodeType["ErrAdmInitRecording"] = 1011] = "ErrAdmInitRecording";
  ErrorCodeType[ErrorCodeType["ErrAdmStartRecording"] = 1012] = "ErrAdmStartRecording";
  ErrorCodeType[ErrorCodeType["ErrAdmStopRecording"] = 1013] = "ErrAdmStopRecording";
  ErrorCodeType[ErrorCodeType["ErrVdmCameraNotAuthorized"] = 1501] = "ErrVdmCameraNotAuthorized";
  return ErrorCodeType;
}({});

/**
 * @ignore
 */
export let LicenseErrorType = /*#__PURE__*/function (LicenseErrorType) {
  LicenseErrorType[LicenseErrorType["LicenseErrInvalid"] = 1] = "LicenseErrInvalid";
  LicenseErrorType[LicenseErrorType["LicenseErrExpire"] = 2] = "LicenseErrExpire";
  LicenseErrorType[LicenseErrorType["LicenseErrMinutesExceed"] = 3] = "LicenseErrMinutesExceed";
  LicenseErrorType[LicenseErrorType["LicenseErrLimitedPeriod"] = 4] = "LicenseErrLimitedPeriod";
  LicenseErrorType[LicenseErrorType["LicenseErrDiffDevices"] = 5] = "LicenseErrDiffDevices";
  LicenseErrorType[LicenseErrorType["LicenseErrInternal"] = 99] = "LicenseErrInternal";
  return LicenseErrorType;
}({});

/**
 * The operation permissions of the SDK on the audio session.
 */
export let AudioSessionOperationRestriction = /*#__PURE__*/function (AudioSessionOperationRestriction) {
  AudioSessionOperationRestriction[AudioSessionOperationRestriction["AudioSessionOperationRestrictionNone"] = 0] = "AudioSessionOperationRestrictionNone";
  AudioSessionOperationRestriction[AudioSessionOperationRestriction["AudioSessionOperationRestrictionSetCategory"] = 1] = "AudioSessionOperationRestrictionSetCategory";
  AudioSessionOperationRestriction[AudioSessionOperationRestriction["AudioSessionOperationRestrictionConfigureSession"] = 2] = "AudioSessionOperationRestrictionConfigureSession";
  AudioSessionOperationRestriction[AudioSessionOperationRestriction["AudioSessionOperationRestrictionDeactivateSession"] = 4] = "AudioSessionOperationRestrictionDeactivateSession";
  AudioSessionOperationRestriction[AudioSessionOperationRestriction["AudioSessionOperationRestrictionAll"] = 128] = "AudioSessionOperationRestrictionAll";
  return AudioSessionOperationRestriction;
}({});

/**
 * Reasons for a user being offline.
 */
export let UserOfflineReasonType = /*#__PURE__*/function (UserOfflineReasonType) {
  UserOfflineReasonType[UserOfflineReasonType["UserOfflineQuit"] = 0] = "UserOfflineQuit";
  UserOfflineReasonType[UserOfflineReasonType["UserOfflineDropped"] = 1] = "UserOfflineDropped";
  UserOfflineReasonType[UserOfflineReasonType["UserOfflineBecomeAudience"] = 2] = "UserOfflineBecomeAudience";
  return UserOfflineReasonType;
}({});

/**
 * The interface class.
 */
export let InterfaceIdType = /*#__PURE__*/function (InterfaceIdType) {
  InterfaceIdType[InterfaceIdType["AgoraIidAudioDeviceManager"] = 1] = "AgoraIidAudioDeviceManager";
  InterfaceIdType[InterfaceIdType["AgoraIidVideoDeviceManager"] = 2] = "AgoraIidVideoDeviceManager";
  InterfaceIdType[InterfaceIdType["AgoraIidParameterEngine"] = 3] = "AgoraIidParameterEngine";
  InterfaceIdType[InterfaceIdType["AgoraIidMediaEngine"] = 4] = "AgoraIidMediaEngine";
  InterfaceIdType[InterfaceIdType["AgoraIidAudioEngine"] = 5] = "AgoraIidAudioEngine";
  InterfaceIdType[InterfaceIdType["AgoraIidVideoEngine"] = 6] = "AgoraIidVideoEngine";
  InterfaceIdType[InterfaceIdType["AgoraIidRtcConnection"] = 7] = "AgoraIidRtcConnection";
  InterfaceIdType[InterfaceIdType["AgoraIidSignalingEngine"] = 8] = "AgoraIidSignalingEngine";
  InterfaceIdType[InterfaceIdType["AgoraIidMediaEngineRegulator"] = 9] = "AgoraIidMediaEngineRegulator";
  InterfaceIdType[InterfaceIdType["AgoraIidLocalSpatialAudio"] = 11] = "AgoraIidLocalSpatialAudio";
  InterfaceIdType[InterfaceIdType["AgoraIidStateSync"] = 13] = "AgoraIidStateSync";
  InterfaceIdType[InterfaceIdType["AgoraIidMetaService"] = 14] = "AgoraIidMetaService";
  InterfaceIdType[InterfaceIdType["AgoraIidMusicContentCenter"] = 15] = "AgoraIidMusicContentCenter";
  InterfaceIdType[InterfaceIdType["AgoraIidH265Transcoder"] = 16] = "AgoraIidH265Transcoder";
  return InterfaceIdType;
}({});

/**
 * Network quality types.
 */
export let QualityType = /*#__PURE__*/function (QualityType) {
  QualityType[QualityType["QualityUnknown"] = 0] = "QualityUnknown";
  QualityType[QualityType["QualityExcellent"] = 1] = "QualityExcellent";
  QualityType[QualityType["QualityGood"] = 2] = "QualityGood";
  QualityType[QualityType["QualityPoor"] = 3] = "QualityPoor";
  QualityType[QualityType["QualityBad"] = 4] = "QualityBad";
  QualityType[QualityType["QualityVbad"] = 5] = "QualityVbad";
  QualityType[QualityType["QualityDown"] = 6] = "QualityDown";
  QualityType[QualityType["QualityUnsupported"] = 7] = "QualityUnsupported";
  QualityType[QualityType["QualityDetecting"] = 8] = "QualityDetecting";
  return QualityType;
}({});

/**
 * @ignore
 */
export let FitModeType = /*#__PURE__*/function (FitModeType) {
  FitModeType[FitModeType["ModeCover"] = 1] = "ModeCover";
  FitModeType[FitModeType["ModeContain"] = 2] = "ModeContain";
  return FitModeType;
}({});

/**
 * The clockwise rotation of the video.
 */
export let VideoOrientation = /*#__PURE__*/function (VideoOrientation) {
  VideoOrientation[VideoOrientation["VideoOrientation0"] = 0] = "VideoOrientation0";
  VideoOrientation[VideoOrientation["VideoOrientation90"] = 90] = "VideoOrientation90";
  VideoOrientation[VideoOrientation["VideoOrientation180"] = 180] = "VideoOrientation180";
  VideoOrientation[VideoOrientation["VideoOrientation270"] = 270] = "VideoOrientation270";
  return VideoOrientation;
}({});

/**
 * The video frame rate.
 */
export let FrameRate = /*#__PURE__*/function (FrameRate) {
  FrameRate[FrameRate["FrameRateFps1"] = 1] = "FrameRateFps1";
  FrameRate[FrameRate["FrameRateFps7"] = 7] = "FrameRateFps7";
  FrameRate[FrameRate["FrameRateFps10"] = 10] = "FrameRateFps10";
  FrameRate[FrameRate["FrameRateFps15"] = 15] = "FrameRateFps15";
  FrameRate[FrameRate["FrameRateFps24"] = 24] = "FrameRateFps24";
  FrameRate[FrameRate["FrameRateFps30"] = 30] = "FrameRateFps30";
  FrameRate[FrameRate["FrameRateFps60"] = 60] = "FrameRateFps60";
  return FrameRate;
}({});

/**
 * @ignore
 */
export let FrameWidth = /*#__PURE__*/function (FrameWidth) {
  FrameWidth[FrameWidth["FrameWidth960"] = 960] = "FrameWidth960";
  return FrameWidth;
}({});

/**
 * @ignore
 */
export let FrameHeight = /*#__PURE__*/function (FrameHeight) {
  FrameHeight[FrameHeight["FrameHeight540"] = 540] = "FrameHeight540";
  return FrameHeight;
}({});

/**
 * The video frame type.
 */
export let VideoFrameType = /*#__PURE__*/function (VideoFrameType) {
  VideoFrameType[VideoFrameType["VideoFrameTypeBlankFrame"] = 0] = "VideoFrameTypeBlankFrame";
  VideoFrameType[VideoFrameType["VideoFrameTypeKeyFrame"] = 3] = "VideoFrameTypeKeyFrame";
  VideoFrameType[VideoFrameType["VideoFrameTypeDeltaFrame"] = 4] = "VideoFrameTypeDeltaFrame";
  VideoFrameType[VideoFrameType["VideoFrameTypeBFrame"] = 5] = "VideoFrameTypeBFrame";
  VideoFrameType[VideoFrameType["VideoFrameTypeDroppableFrame"] = 6] = "VideoFrameTypeDroppableFrame";
  VideoFrameType[VideoFrameType["VideoFrameTypeUnknow"] = 7] = "VideoFrameTypeUnknow";
  return VideoFrameType;
}({});

/**
 * Video output orientation mode.
 */
export let OrientationMode = /*#__PURE__*/function (OrientationMode) {
  OrientationMode[OrientationMode["OrientationModeAdaptive"] = 0] = "OrientationModeAdaptive";
  OrientationMode[OrientationMode["OrientationModeFixedLandscape"] = 1] = "OrientationModeFixedLandscape";
  OrientationMode[OrientationMode["OrientationModeFixedPortrait"] = 2] = "OrientationModeFixedPortrait";
  return OrientationMode;
}({});

/**
 * Video degradation preferences when the bandwidth is a constraint.
 */
export let DegradationPreference = /*#__PURE__*/function (DegradationPreference) {
  DegradationPreference[DegradationPreference["MaintainAuto"] = -1] = "MaintainAuto";
  DegradationPreference[DegradationPreference["MaintainQuality"] = 0] = "MaintainQuality";
  DegradationPreference[DegradationPreference["MaintainFramerate"] = 1] = "MaintainFramerate";
  DegradationPreference[DegradationPreference["MaintainBalanced"] = 2] = "MaintainBalanced";
  DegradationPreference[DegradationPreference["MaintainResolution"] = 3] = "MaintainResolution";
  DegradationPreference[DegradationPreference["Disabled"] = 100] = "Disabled";
  return DegradationPreference;
}({});

/**
 * The video dimension.
 */
export class VideoDimensions {}

/**
 * The highest frame rate supported by the screen sharing device.
 */
export let ScreenCaptureFramerateCapability = /*#__PURE__*/function (ScreenCaptureFramerateCapability) {
  ScreenCaptureFramerateCapability[ScreenCaptureFramerateCapability["ScreenCaptureFramerateCapability15Fps"] = 0] = "ScreenCaptureFramerateCapability15Fps";
  ScreenCaptureFramerateCapability[ScreenCaptureFramerateCapability["ScreenCaptureFramerateCapability30Fps"] = 1] = "ScreenCaptureFramerateCapability30Fps";
  ScreenCaptureFramerateCapability[ScreenCaptureFramerateCapability["ScreenCaptureFramerateCapability60Fps"] = 2] = "ScreenCaptureFramerateCapability60Fps";
  return ScreenCaptureFramerateCapability;
}({});

/**
 * @ignore
 */
export let VideoCodecCapabilityLevel = /*#__PURE__*/function (VideoCodecCapabilityLevel) {
  VideoCodecCapabilityLevel[VideoCodecCapabilityLevel["CodecCapabilityLevelUnspecified"] = -1] = "CodecCapabilityLevelUnspecified";
  VideoCodecCapabilityLevel[VideoCodecCapabilityLevel["CodecCapabilityLevelBasicSupport"] = 5] = "CodecCapabilityLevelBasicSupport";
  VideoCodecCapabilityLevel[VideoCodecCapabilityLevel["CodecCapabilityLevel1080p30fps"] = 10] = "CodecCapabilityLevel1080p30fps";
  VideoCodecCapabilityLevel[VideoCodecCapabilityLevel["CodecCapabilityLevel1080p60fps"] = 20] = "CodecCapabilityLevel1080p60fps";
  VideoCodecCapabilityLevel[VideoCodecCapabilityLevel["CodecCapabilityLevel4k60fps"] = 30] = "CodecCapabilityLevel4k60fps";
  return VideoCodecCapabilityLevel;
}({});

/**
 * Video codec types.
 */
export let VideoCodecType = /*#__PURE__*/function (VideoCodecType) {
  VideoCodecType[VideoCodecType["VideoCodecNone"] = 0] = "VideoCodecNone";
  VideoCodecType[VideoCodecType["VideoCodecVp8"] = 1] = "VideoCodecVp8";
  VideoCodecType[VideoCodecType["VideoCodecH264"] = 2] = "VideoCodecH264";
  VideoCodecType[VideoCodecType["VideoCodecH265"] = 3] = "VideoCodecH265";
  VideoCodecType[VideoCodecType["VideoCodecGeneric"] = 6] = "VideoCodecGeneric";
  VideoCodecType[VideoCodecType["VideoCodecGenericH264"] = 7] = "VideoCodecGenericH264";
  VideoCodecType[VideoCodecType["VideoCodecAv1"] = 12] = "VideoCodecAv1";
  VideoCodecType[VideoCodecType["VideoCodecVp9"] = 13] = "VideoCodecVp9";
  VideoCodecType[VideoCodecType["VideoCodecGenericJpeg"] = 20] = "VideoCodecGenericJpeg";
  return VideoCodecType;
}({});

/**
 * The camera focal length types.
 */
export let CameraFocalLengthType = /*#__PURE__*/function (CameraFocalLengthType) {
  CameraFocalLengthType[CameraFocalLengthType["CameraFocalLengthDefault"] = 0] = "CameraFocalLengthDefault";
  CameraFocalLengthType[CameraFocalLengthType["CameraFocalLengthWideAngle"] = 1] = "CameraFocalLengthWideAngle";
  CameraFocalLengthType[CameraFocalLengthType["CameraFocalLengthUltraWide"] = 2] = "CameraFocalLengthUltraWide";
  CameraFocalLengthType[CameraFocalLengthType["CameraFocalLengthTelephoto"] = 3] = "CameraFocalLengthTelephoto";
  return CameraFocalLengthType;
}({});

/**
 * @ignore
 */
export let TCcMode = /*#__PURE__*/function (TCcMode) {
  TCcMode[TCcMode["CcEnabled"] = 0] = "CcEnabled";
  TCcMode[TCcMode["CcDisabled"] = 1] = "CcDisabled";
  return TCcMode;
}({});

/**
 * @ignore
 */
export class SenderOptions {}

/**
 * The codec type of audio.
 */
export let AudioCodecType = /*#__PURE__*/function (AudioCodecType) {
  AudioCodecType[AudioCodecType["AudioCodecOpus"] = 1] = "AudioCodecOpus";
  AudioCodecType[AudioCodecType["AudioCodecPcma"] = 3] = "AudioCodecPcma";
  AudioCodecType[AudioCodecType["AudioCodecPcmu"] = 4] = "AudioCodecPcmu";
  AudioCodecType[AudioCodecType["AudioCodecG722"] = 5] = "AudioCodecG722";
  AudioCodecType[AudioCodecType["AudioCodecAaclc"] = 8] = "AudioCodecAaclc";
  AudioCodecType[AudioCodecType["AudioCodecHeaac"] = 9] = "AudioCodecHeaac";
  AudioCodecType[AudioCodecType["AudioCodecJc1"] = 10] = "AudioCodecJc1";
  AudioCodecType[AudioCodecType["AudioCodecHeaac2"] = 11] = "AudioCodecHeaac2";
  AudioCodecType[AudioCodecType["AudioCodecLpcnet"] = 12] = "AudioCodecLpcnet";
  AudioCodecType[AudioCodecType["AudioCodecOpusmc"] = 13] = "AudioCodecOpusmc";
  return AudioCodecType;
}({});

/**
 * Audio encoding type.
 */
export let AudioEncodingType = /*#__PURE__*/function (AudioEncodingType) {
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac16000Low"] = 65793] = "AudioEncodingTypeAac16000Low";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac16000Medium"] = 65794] = "AudioEncodingTypeAac16000Medium";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac32000Low"] = 66049] = "AudioEncodingTypeAac32000Low";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac32000Medium"] = 66050] = "AudioEncodingTypeAac32000Medium";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac32000High"] = 66051] = "AudioEncodingTypeAac32000High";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac48000Medium"] = 66306] = "AudioEncodingTypeAac48000Medium";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeAac48000High"] = 66307] = "AudioEncodingTypeAac48000High";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeOpus16000Low"] = 131329] = "AudioEncodingTypeOpus16000Low";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeOpus16000Medium"] = 131330] = "AudioEncodingTypeOpus16000Medium";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeOpus48000Medium"] = 131842] = "AudioEncodingTypeOpus48000Medium";
  AudioEncodingType[AudioEncodingType["AudioEncodingTypeOpus48000High"] = 131843] = "AudioEncodingTypeOpus48000High";
  return AudioEncodingType;
}({});

/**
 * The adaptation mode of the watermark.
 */
export let WatermarkFitMode = /*#__PURE__*/function (WatermarkFitMode) {
  WatermarkFitMode[WatermarkFitMode["FitModeCoverPosition"] = 0] = "FitModeCoverPosition";
  WatermarkFitMode[WatermarkFitMode["FitModeUseImageRatio"] = 1] = "FitModeUseImageRatio";
  return WatermarkFitMode;
}({});

/**
 * @ignore
 */
export class EncodedAudioFrameAdvancedSettings {}

/**
 * Audio information after encoding.
 */
export class EncodedAudioFrameInfo {}

/**
 * @ignore
 */
export class AudioPcmDataInfo {}

/**
 * @ignore
 */
export let H264PacketizeMode = /*#__PURE__*/function (H264PacketizeMode) {
  H264PacketizeMode[H264PacketizeMode["NonInterleaved"] = 0] = "NonInterleaved";
  H264PacketizeMode[H264PacketizeMode["SingleNalUnit"] = 1] = "SingleNalUnit";
  return H264PacketizeMode;
}({});

/**
 * The type of video streams.
 */
export let VideoStreamType = /*#__PURE__*/function (VideoStreamType) {
  VideoStreamType[VideoStreamType["VideoStreamHigh"] = 0] = "VideoStreamHigh";
  VideoStreamType[VideoStreamType["VideoStreamLow"] = 1] = "VideoStreamLow";
  VideoStreamType[VideoStreamType["VideoStreamLayer1"] = 4] = "VideoStreamLayer1";
  VideoStreamType[VideoStreamType["VideoStreamLayer2"] = 5] = "VideoStreamLayer2";
  VideoStreamType[VideoStreamType["VideoStreamLayer3"] = 6] = "VideoStreamLayer3";
  VideoStreamType[VideoStreamType["VideoStreamLayer4"] = 7] = "VideoStreamLayer4";
  VideoStreamType[VideoStreamType["VideoStreamLayer5"] = 8] = "VideoStreamLayer5";
  VideoStreamType[VideoStreamType["VideoStreamLayer6"] = 9] = "VideoStreamLayer6";
  return VideoStreamType;
}({});

/**
 * Video subscription options.
 */
export class VideoSubscriptionOptions {}

/**
 * The maximum length of the user account.
 */
export let MaxUserAccountLengthType = /*#__PURE__*/function (MaxUserAccountLengthType) {
  MaxUserAccountLengthType[MaxUserAccountLengthType["MaxUserAccountLength"] = 256] = "MaxUserAccountLength";
  return MaxUserAccountLengthType;
}({});

/**
 * Information about externally encoded video frames.
 */
export class EncodedVideoFrameInfo {}

/**
 * Compression preference for video encoding.
 */
export let CompressionPreference = /*#__PURE__*/function (CompressionPreference) {
  CompressionPreference[CompressionPreference["PreferCompressionAuto"] = -1] = "PreferCompressionAuto";
  CompressionPreference[CompressionPreference["PreferLowLatency"] = 0] = "PreferLowLatency";
  CompressionPreference[CompressionPreference["PreferQuality"] = 1] = "PreferQuality";
  return CompressionPreference;
}({});

/**
 * Video encoder preference.
 */
export let EncodingPreference = /*#__PURE__*/function (EncodingPreference) {
  EncodingPreference[EncodingPreference["PreferAuto"] = -1] = "PreferAuto";
  EncodingPreference[EncodingPreference["PreferSoftware"] = 0] = "PreferSoftware";
  EncodingPreference[EncodingPreference["PreferHardware"] = 1] = "PreferHardware";
  return EncodingPreference;
}({});

/**
 * Advanced options for video encoding.
 */
export class AdvanceOptions {}

/**
 * Video mirror mode.
 */
export let VideoMirrorModeType = /*#__PURE__*/function (VideoMirrorModeType) {
  VideoMirrorModeType[VideoMirrorModeType["VideoMirrorModeAuto"] = 0] = "VideoMirrorModeAuto";
  VideoMirrorModeType[VideoMirrorModeType["VideoMirrorModeEnabled"] = 1] = "VideoMirrorModeEnabled";
  VideoMirrorModeType[VideoMirrorModeType["VideoMirrorModeDisabled"] = 2] = "VideoMirrorModeDisabled";
  return VideoMirrorModeType;
}({});

/**
 * @ignore
 */
export let CameraFormatType = /*#__PURE__*/function (CameraFormatType) {
  CameraFormatType[CameraFormatType["CameraFormatNv12"] = 0] = "CameraFormatNv12";
  CameraFormatType[CameraFormatType["CameraFormatBgra"] = 1] = "CameraFormatBgra";
  return CameraFormatType;
}({});

/**
 * @ignore
 */
export let VideoModuleType = /*#__PURE__*/function (VideoModuleType) {
  VideoModuleType[VideoModuleType["VideoModuleCapturer"] = 0] = "VideoModuleCapturer";
  VideoModuleType[VideoModuleType["VideoModuleSoftwareEncoder"] = 1] = "VideoModuleSoftwareEncoder";
  VideoModuleType[VideoModuleType["VideoModuleHardwareEncoder"] = 2] = "VideoModuleHardwareEncoder";
  VideoModuleType[VideoModuleType["VideoModuleSoftwareDecoder"] = 3] = "VideoModuleSoftwareDecoder";
  VideoModuleType[VideoModuleType["VideoModuleHardwareDecoder"] = 4] = "VideoModuleHardwareDecoder";
  VideoModuleType[VideoModuleType["VideoModuleRenderer"] = 5] = "VideoModuleRenderer";
  return VideoModuleType;
}({});

/**
 * @ignore
 */
export let HdrCapability = /*#__PURE__*/function (HdrCapability) {
  HdrCapability[HdrCapability["HdrCapabilityUnknown"] = -1] = "HdrCapabilityUnknown";
  HdrCapability[HdrCapability["HdrCapabilityUnsupported"] = 0] = "HdrCapabilityUnsupported";
  HdrCapability[HdrCapability["HdrCapabilitySupported"] = 1] = "HdrCapabilitySupported";
  return HdrCapability;
}({});

/**
 * The bit mask of the codec type.
 */
export let CodecCapMask = /*#__PURE__*/function (CodecCapMask) {
  CodecCapMask[CodecCapMask["CodecCapMaskNone"] = 0] = "CodecCapMaskNone";
  CodecCapMask[CodecCapMask["CodecCapMaskHwDec"] = 1] = "CodecCapMaskHwDec";
  CodecCapMask[CodecCapMask["CodecCapMaskHwEnc"] = 2] = "CodecCapMaskHwEnc";
  CodecCapMask[CodecCapMask["CodecCapMaskSwDec"] = 4] = "CodecCapMaskSwDec";
  CodecCapMask[CodecCapMask["CodecCapMaskSwEnc"] = 8] = "CodecCapMaskSwEnc";
  return CodecCapMask;
}({});

/**
 * The level of the codec capability.
 */
export class CodecCapLevels {}

/**
 * The codec capability of the SDK.
 */
export class CodecCapInfo {}

/**
 * Focal length information supported by the camera, including the camera direction and focal length type.
 */
export class FocalLengthInfo {}

/**
 * Video encoder configurations.
 */
export class VideoEncoderConfiguration {}

/**
 * The configurations for the data stream.
 *
 * The following table shows the SDK behaviors under different parameter settings:
 */
export class DataStreamConfig {}

/**
 * The mode in which the video stream is sent.
 */
export let SimulcastStreamMode = /*#__PURE__*/function (SimulcastStreamMode) {
  SimulcastStreamMode[SimulcastStreamMode["AutoSimulcastStream"] = -1] = "AutoSimulcastStream";
  SimulcastStreamMode[SimulcastStreamMode["DisableSimulcastStream"] = 0] = "DisableSimulcastStream";
  SimulcastStreamMode[SimulcastStreamMode["EnableSimulcastStream"] = 1] = "EnableSimulcastStream";
  return SimulcastStreamMode;
}({});

/**
 * The configuration of the low-quality video stream.
 */
export class SimulcastStreamConfig {}

/**
 * @ignore
 */
export let StreamLayerIndex = /*#__PURE__*/function (StreamLayerIndex) {
  StreamLayerIndex[StreamLayerIndex["StreamLayer1"] = 0] = "StreamLayer1";
  StreamLayerIndex[StreamLayerIndex["StreamLayer2"] = 1] = "StreamLayer2";
  StreamLayerIndex[StreamLayerIndex["StreamLayer3"] = 2] = "StreamLayer3";
  StreamLayerIndex[StreamLayerIndex["StreamLayer4"] = 3] = "StreamLayer4";
  StreamLayerIndex[StreamLayerIndex["StreamLayer5"] = 4] = "StreamLayer5";
  StreamLayerIndex[StreamLayerIndex["StreamLayer6"] = 5] = "StreamLayer6";
  StreamLayerIndex[StreamLayerIndex["StreamLow"] = 6] = "StreamLow";
  StreamLayerIndex[StreamLayerIndex["StreamLayerCountMax"] = 7] = "StreamLayerCountMax";
  return StreamLayerIndex;
}({});

/**
 * @ignore
 */
export class StreamLayerConfig {}

/**
 * @ignore
 */
export class SimulcastConfig {}

/**
 * The location of the target area relative to the screen or window. If you do not set this parameter, the SDK selects the whole screen or window.
 */
export class Rectangle {}

/**
 * The position and size of the watermark on the screen.
 *
 * The position and size of the watermark on the screen are determined by xRatio, yRatio, and widthRatio :
 *  (xRatio, yRatio) refers to the coordinates of the upper left corner of the watermark, which determines the distance from the upper left corner of the watermark to the upper left corner of the screen.
 *  The widthRatio determines the width of the watermark.
 */
export class WatermarkRatio {}

/**
 * Configurations of the watermark image.
 */
export class WatermarkOptions {}

/**
 * Statistics of a call session.
 */
export class RtcStats {}

/**
 * The user role in the interactive live streaming.
 */
export let ClientRoleType = /*#__PURE__*/function (ClientRoleType) {
  ClientRoleType[ClientRoleType["ClientRoleBroadcaster"] = 1] = "ClientRoleBroadcaster";
  ClientRoleType[ClientRoleType["ClientRoleAudience"] = 2] = "ClientRoleAudience";
  return ClientRoleType;
}({});

/**
 * Quality change of the local video in terms of target frame rate and target bit rate since last count.
 */
export let QualityAdaptIndication = /*#__PURE__*/function (QualityAdaptIndication) {
  QualityAdaptIndication[QualityAdaptIndication["AdaptNone"] = 0] = "AdaptNone";
  QualityAdaptIndication[QualityAdaptIndication["AdaptUpBandwidth"] = 1] = "AdaptUpBandwidth";
  QualityAdaptIndication[QualityAdaptIndication["AdaptDownBandwidth"] = 2] = "AdaptDownBandwidth";
  return QualityAdaptIndication;
}({});

/**
 * The latency level of an audience member in interactive live streaming. This enum takes effect only when the user role is set to ClientRoleAudience .
 */
export let AudienceLatencyLevelType = /*#__PURE__*/function (AudienceLatencyLevelType) {
  AudienceLatencyLevelType[AudienceLatencyLevelType["AudienceLatencyLevelLowLatency"] = 1] = "AudienceLatencyLevelLowLatency";
  AudienceLatencyLevelType[AudienceLatencyLevelType["AudienceLatencyLevelUltraLowLatency"] = 2] = "AudienceLatencyLevelUltraLowLatency";
  return AudienceLatencyLevelType;
}({});

/**
 * Setting of user role properties.
 */
export class ClientRoleOptions {}

/**
 * The Quality of Experience (QoE) of the local user when receiving a remote audio stream.
 */
export let ExperienceQualityType = /*#__PURE__*/function (ExperienceQualityType) {
  ExperienceQualityType[ExperienceQualityType["ExperienceQualityGood"] = 0] = "ExperienceQualityGood";
  ExperienceQualityType[ExperienceQualityType["ExperienceQualityBad"] = 1] = "ExperienceQualityBad";
  return ExperienceQualityType;
}({});

/**
 * Reasons why the QoE of the local user when receiving a remote audio stream is poor.
 */
export let ExperiencePoorReason = /*#__PURE__*/function (ExperiencePoorReason) {
  ExperiencePoorReason[ExperiencePoorReason["ExperienceReasonNone"] = 0] = "ExperienceReasonNone";
  ExperiencePoorReason[ExperiencePoorReason["RemoteNetworkQualityPoor"] = 1] = "RemoteNetworkQualityPoor";
  ExperiencePoorReason[ExperiencePoorReason["LocalNetworkQualityPoor"] = 2] = "LocalNetworkQualityPoor";
  ExperiencePoorReason[ExperiencePoorReason["WirelessSignalPoor"] = 4] = "WirelessSignalPoor";
  ExperiencePoorReason[ExperiencePoorReason["WifiBluetoothCoexist"] = 8] = "WifiBluetoothCoexist";
  return ExperiencePoorReason;
}({});

/**
 * AI noise suppression modes.
 */
export let AudioAinsMode = /*#__PURE__*/function (AudioAinsMode) {
  AudioAinsMode[AudioAinsMode["AinsModeBalanced"] = 0] = "AinsModeBalanced";
  AudioAinsMode[AudioAinsMode["AinsModeAggressive"] = 1] = "AinsModeAggressive";
  AudioAinsMode[AudioAinsMode["AinsModeUltralowlatency"] = 2] = "AinsModeUltralowlatency";
  return AudioAinsMode;
}({});

/**
 * The audio profile.
 */
export let AudioProfileType = /*#__PURE__*/function (AudioProfileType) {
  AudioProfileType[AudioProfileType["AudioProfileDefault"] = 0] = "AudioProfileDefault";
  AudioProfileType[AudioProfileType["AudioProfileSpeechStandard"] = 1] = "AudioProfileSpeechStandard";
  AudioProfileType[AudioProfileType["AudioProfileMusicStandard"] = 2] = "AudioProfileMusicStandard";
  AudioProfileType[AudioProfileType["AudioProfileMusicStandardStereo"] = 3] = "AudioProfileMusicStandardStereo";
  AudioProfileType[AudioProfileType["AudioProfileMusicHighQuality"] = 4] = "AudioProfileMusicHighQuality";
  AudioProfileType[AudioProfileType["AudioProfileMusicHighQualityStereo"] = 5] = "AudioProfileMusicHighQualityStereo";
  AudioProfileType[AudioProfileType["AudioProfileIot"] = 6] = "AudioProfileIot";
  AudioProfileType[AudioProfileType["AudioProfileNum"] = 7] = "AudioProfileNum";
  return AudioProfileType;
}({});

/**
 * The audio scenarios.
 */
export let AudioScenarioType = /*#__PURE__*/function (AudioScenarioType) {
  AudioScenarioType[AudioScenarioType["AudioScenarioDefault"] = 0] = "AudioScenarioDefault";
  AudioScenarioType[AudioScenarioType["AudioScenarioGameStreaming"] = 3] = "AudioScenarioGameStreaming";
  AudioScenarioType[AudioScenarioType["AudioScenarioChatroom"] = 5] = "AudioScenarioChatroom";
  AudioScenarioType[AudioScenarioType["AudioScenarioChorus"] = 7] = "AudioScenarioChorus";
  AudioScenarioType[AudioScenarioType["AudioScenarioMeeting"] = 8] = "AudioScenarioMeeting";
  AudioScenarioType[AudioScenarioType["AudioScenarioAiServer"] = 9] = "AudioScenarioAiServer";
  AudioScenarioType[AudioScenarioType["AudioScenarioAiClient"] = 10] = "AudioScenarioAiClient";
  AudioScenarioType[AudioScenarioType["AudioScenarioNum"] = 11] = "AudioScenarioNum";
  return AudioScenarioType;
}({});

/**
 * The format of the video frame.
 */
export class VideoFormat {}

/**
 * The content hint for screen sharing.
 */
export let VideoContentHint = /*#__PURE__*/function (VideoContentHint) {
  VideoContentHint[VideoContentHint["ContentHintNone"] = 0] = "ContentHintNone";
  VideoContentHint[VideoContentHint["ContentHintMotion"] = 1] = "ContentHintMotion";
  VideoContentHint[VideoContentHint["ContentHintDetails"] = 2] = "ContentHintDetails";
  return VideoContentHint;
}({});

/**
 * The screen sharing scenario.
 */
export let ScreenScenarioType = /*#__PURE__*/function (ScreenScenarioType) {
  ScreenScenarioType[ScreenScenarioType["ScreenScenarioDocument"] = 1] = "ScreenScenarioDocument";
  ScreenScenarioType[ScreenScenarioType["ScreenScenarioGaming"] = 2] = "ScreenScenarioGaming";
  ScreenScenarioType[ScreenScenarioType["ScreenScenarioVideo"] = 3] = "ScreenScenarioVideo";
  ScreenScenarioType[ScreenScenarioType["ScreenScenarioRdc"] = 4] = "ScreenScenarioRdc";
  return ScreenScenarioType;
}({});

/**
 * The video application scenarios.
 */
export let VideoApplicationScenarioType = /*#__PURE__*/function (VideoApplicationScenarioType) {
  VideoApplicationScenarioType[VideoApplicationScenarioType["ApplicationScenarioGeneral"] = 0] = "ApplicationScenarioGeneral";
  VideoApplicationScenarioType[VideoApplicationScenarioType["ApplicationScenarioMeeting"] = 1] = "ApplicationScenarioMeeting";
  VideoApplicationScenarioType[VideoApplicationScenarioType["ApplicationScenario1v1"] = 2] = "ApplicationScenario1v1";
  VideoApplicationScenarioType[VideoApplicationScenarioType["ApplicationScenarioLiveshow"] = 3] = "ApplicationScenarioLiveshow";
  return VideoApplicationScenarioType;
}({});

/**
 * @ignore
 */
export let VideoQoePreferenceType = /*#__PURE__*/function (VideoQoePreferenceType) {
  VideoQoePreferenceType[VideoQoePreferenceType["VideoQoePreferenceBalance"] = 1] = "VideoQoePreferenceBalance";
  VideoQoePreferenceType[VideoQoePreferenceType["VideoQoePreferenceDelayFirst"] = 2] = "VideoQoePreferenceDelayFirst";
  VideoQoePreferenceType[VideoQoePreferenceType["VideoQoePreferencePictureQualityFirst"] = 3] = "VideoQoePreferencePictureQualityFirst";
  VideoQoePreferenceType[VideoQoePreferenceType["VideoQoePreferenceFluencyFirst"] = 4] = "VideoQoePreferenceFluencyFirst";
  return VideoQoePreferenceType;
}({});

/**
 * The brightness level of the video image captured by the local camera.
 */
export let CaptureBrightnessLevelType = /*#__PURE__*/function (CaptureBrightnessLevelType) {
  CaptureBrightnessLevelType[CaptureBrightnessLevelType["CaptureBrightnessLevelInvalid"] = -1] = "CaptureBrightnessLevelInvalid";
  CaptureBrightnessLevelType[CaptureBrightnessLevelType["CaptureBrightnessLevelNormal"] = 0] = "CaptureBrightnessLevelNormal";
  CaptureBrightnessLevelType[CaptureBrightnessLevelType["CaptureBrightnessLevelBright"] = 1] = "CaptureBrightnessLevelBright";
  CaptureBrightnessLevelType[CaptureBrightnessLevelType["CaptureBrightnessLevelDark"] = 2] = "CaptureBrightnessLevelDark";
  return CaptureBrightnessLevelType;
}({});

/**
 * Camera stabilization modes.
 *
 * The camera stabilization effect increases in the order of 1 < 2 < 3, and the latency will also increase accordingly.
 */
export let CameraStabilizationMode = /*#__PURE__*/function (CameraStabilizationMode) {
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeOff"] = -1] = "CameraStabilizationModeOff";
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeAuto"] = 0] = "CameraStabilizationModeAuto";
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeLevel1"] = 1] = "CameraStabilizationModeLevel1";
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeLevel2"] = 2] = "CameraStabilizationModeLevel2";
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeLevel3"] = 3] = "CameraStabilizationModeLevel3";
  CameraStabilizationMode[CameraStabilizationMode["CameraStabilizationModeMaxLevel"] = 3] = "CameraStabilizationModeMaxLevel";
  return CameraStabilizationMode;
}({});

/**
 * The state of the local audio.
 */
export let LocalAudioStreamState = /*#__PURE__*/function (LocalAudioStreamState) {
  LocalAudioStreamState[LocalAudioStreamState["LocalAudioStreamStateStopped"] = 0] = "LocalAudioStreamStateStopped";
  LocalAudioStreamState[LocalAudioStreamState["LocalAudioStreamStateRecording"] = 1] = "LocalAudioStreamStateRecording";
  LocalAudioStreamState[LocalAudioStreamState["LocalAudioStreamStateEncoding"] = 2] = "LocalAudioStreamStateEncoding";
  LocalAudioStreamState[LocalAudioStreamState["LocalAudioStreamStateFailed"] = 3] = "LocalAudioStreamStateFailed";
  return LocalAudioStreamState;
}({});

/**
 * Reasons for local audio state changes.
 */
export let LocalAudioStreamReason = /*#__PURE__*/function (LocalAudioStreamReason) {
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonOk"] = 0] = "LocalAudioStreamReasonOk";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonFailure"] = 1] = "LocalAudioStreamReasonFailure";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonDeviceNoPermission"] = 2] = "LocalAudioStreamReasonDeviceNoPermission";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonDeviceBusy"] = 3] = "LocalAudioStreamReasonDeviceBusy";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonRecordFailure"] = 4] = "LocalAudioStreamReasonRecordFailure";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonEncodeFailure"] = 5] = "LocalAudioStreamReasonEncodeFailure";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonNoRecordingDevice"] = 6] = "LocalAudioStreamReasonNoRecordingDevice";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonNoPlayoutDevice"] = 7] = "LocalAudioStreamReasonNoPlayoutDevice";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonInterrupted"] = 8] = "LocalAudioStreamReasonInterrupted";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonRecordInvalidId"] = 9] = "LocalAudioStreamReasonRecordInvalidId";
  LocalAudioStreamReason[LocalAudioStreamReason["LocalAudioStreamReasonPlayoutInvalidId"] = 10] = "LocalAudioStreamReasonPlayoutInvalidId";
  return LocalAudioStreamReason;
}({});

/**
 * Local video state types.
 */
export let LocalVideoStreamState = /*#__PURE__*/function (LocalVideoStreamState) {
  LocalVideoStreamState[LocalVideoStreamState["LocalVideoStreamStateStopped"] = 0] = "LocalVideoStreamStateStopped";
  LocalVideoStreamState[LocalVideoStreamState["LocalVideoStreamStateCapturing"] = 1] = "LocalVideoStreamStateCapturing";
  LocalVideoStreamState[LocalVideoStreamState["LocalVideoStreamStateEncoding"] = 2] = "LocalVideoStreamStateEncoding";
  LocalVideoStreamState[LocalVideoStreamState["LocalVideoStreamStateFailed"] = 3] = "LocalVideoStreamStateFailed";
  return LocalVideoStreamState;
}({});

/**
 * Reasons for local video state changes.
 */
export let LocalVideoStreamReason = /*#__PURE__*/function (LocalVideoStreamReason) {
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonOk"] = 0] = "LocalVideoStreamReasonOk";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonFailure"] = 1] = "LocalVideoStreamReasonFailure";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceNoPermission"] = 2] = "LocalVideoStreamReasonDeviceNoPermission";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceBusy"] = 3] = "LocalVideoStreamReasonDeviceBusy";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonCaptureFailure"] = 4] = "LocalVideoStreamReasonCaptureFailure";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonCodecNotSupport"] = 5] = "LocalVideoStreamReasonCodecNotSupport";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonCaptureInbackground"] = 6] = "LocalVideoStreamReasonCaptureInbackground";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonCaptureMultipleForegroundApps"] = 7] = "LocalVideoStreamReasonCaptureMultipleForegroundApps";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceNotFound"] = 8] = "LocalVideoStreamReasonDeviceNotFound";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceDisconnected"] = 9] = "LocalVideoStreamReasonDeviceDisconnected";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceInvalidId"] = 10] = "LocalVideoStreamReasonDeviceInvalidId";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceInterrupt"] = 14] = "LocalVideoStreamReasonDeviceInterrupt";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceFatalError"] = 15] = "LocalVideoStreamReasonDeviceFatalError";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonDeviceSystemPressure"] = 101] = "LocalVideoStreamReasonDeviceSystemPressure";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowMinimized"] = 11] = "LocalVideoStreamReasonScreenCaptureWindowMinimized";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowClosed"] = 12] = "LocalVideoStreamReasonScreenCaptureWindowClosed";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowOccluded"] = 13] = "LocalVideoStreamReasonScreenCaptureWindowOccluded";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowNotSupported"] = 20] = "LocalVideoStreamReasonScreenCaptureWindowNotSupported";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureFailure"] = 21] = "LocalVideoStreamReasonScreenCaptureFailure";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureNoPermission"] = 22] = "LocalVideoStreamReasonScreenCaptureNoPermission";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureAutoFallback"] = 24] = "LocalVideoStreamReasonScreenCaptureAutoFallback";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowHidden"] = 25] = "LocalVideoStreamReasonScreenCaptureWindowHidden";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowRecoverFromHidden"] = 26] = "LocalVideoStreamReasonScreenCaptureWindowRecoverFromHidden";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureWindowRecoverFromMinimized"] = 27] = "LocalVideoStreamReasonScreenCaptureWindowRecoverFromMinimized";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCapturePaused"] = 28] = "LocalVideoStreamReasonScreenCapturePaused";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureResumed"] = 29] = "LocalVideoStreamReasonScreenCaptureResumed";
  LocalVideoStreamReason[LocalVideoStreamReason["LocalVideoStreamReasonScreenCaptureDisplayDisconnected"] = 30] = "LocalVideoStreamReasonScreenCaptureDisplayDisconnected";
  return LocalVideoStreamReason;
}({});

/**
 * Remote audio states.
 */
export let RemoteAudioState = /*#__PURE__*/function (RemoteAudioState) {
  RemoteAudioState[RemoteAudioState["RemoteAudioStateStopped"] = 0] = "RemoteAudioStateStopped";
  RemoteAudioState[RemoteAudioState["RemoteAudioStateStarting"] = 1] = "RemoteAudioStateStarting";
  RemoteAudioState[RemoteAudioState["RemoteAudioStateDecoding"] = 2] = "RemoteAudioStateDecoding";
  RemoteAudioState[RemoteAudioState["RemoteAudioStateFrozen"] = 3] = "RemoteAudioStateFrozen";
  RemoteAudioState[RemoteAudioState["RemoteAudioStateFailed"] = 4] = "RemoteAudioStateFailed";
  return RemoteAudioState;
}({});

/**
 * The reason for the remote audio state change.
 */
export let RemoteAudioStateReason = /*#__PURE__*/function (RemoteAudioStateReason) {
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonInternal"] = 0] = "RemoteAudioReasonInternal";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonNetworkCongestion"] = 1] = "RemoteAudioReasonNetworkCongestion";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonNetworkRecovery"] = 2] = "RemoteAudioReasonNetworkRecovery";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonLocalMuted"] = 3] = "RemoteAudioReasonLocalMuted";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonLocalUnmuted"] = 4] = "RemoteAudioReasonLocalUnmuted";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonRemoteMuted"] = 5] = "RemoteAudioReasonRemoteMuted";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonRemoteUnmuted"] = 6] = "RemoteAudioReasonRemoteUnmuted";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonRemoteOffline"] = 7] = "RemoteAudioReasonRemoteOffline";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonNoPacketReceive"] = 8] = "RemoteAudioReasonNoPacketReceive";
  RemoteAudioStateReason[RemoteAudioStateReason["RemoteAudioReasonLocalPlayFailed"] = 9] = "RemoteAudioReasonLocalPlayFailed";
  return RemoteAudioStateReason;
}({});

/**
 * The state of the remote video stream.
 */
export let RemoteVideoState = /*#__PURE__*/function (RemoteVideoState) {
  RemoteVideoState[RemoteVideoState["RemoteVideoStateStopped"] = 0] = "RemoteVideoStateStopped";
  RemoteVideoState[RemoteVideoState["RemoteVideoStateStarting"] = 1] = "RemoteVideoStateStarting";
  RemoteVideoState[RemoteVideoState["RemoteVideoStateDecoding"] = 2] = "RemoteVideoStateDecoding";
  RemoteVideoState[RemoteVideoState["RemoteVideoStateFrozen"] = 3] = "RemoteVideoStateFrozen";
  RemoteVideoState[RemoteVideoState["RemoteVideoStateFailed"] = 4] = "RemoteVideoStateFailed";
  return RemoteVideoState;
}({});

/**
 * The reason for the remote video state change.
 */
export let RemoteVideoStateReason = /*#__PURE__*/function (RemoteVideoStateReason) {
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonInternal"] = 0] = "RemoteVideoStateReasonInternal";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonNetworkCongestion"] = 1] = "RemoteVideoStateReasonNetworkCongestion";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonNetworkRecovery"] = 2] = "RemoteVideoStateReasonNetworkRecovery";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonLocalMuted"] = 3] = "RemoteVideoStateReasonLocalMuted";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonLocalUnmuted"] = 4] = "RemoteVideoStateReasonLocalUnmuted";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonRemoteMuted"] = 5] = "RemoteVideoStateReasonRemoteMuted";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonRemoteUnmuted"] = 6] = "RemoteVideoStateReasonRemoteUnmuted";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonRemoteOffline"] = 7] = "RemoteVideoStateReasonRemoteOffline";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonAudioFallback"] = 8] = "RemoteVideoStateReasonAudioFallback";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonAudioFallbackRecovery"] = 9] = "RemoteVideoStateReasonAudioFallbackRecovery";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonVideoStreamTypeChangeToLow"] = 10] = "RemoteVideoStateReasonVideoStreamTypeChangeToLow";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonVideoStreamTypeChangeToHigh"] = 11] = "RemoteVideoStateReasonVideoStreamTypeChangeToHigh";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonSdkInBackground"] = 12] = "RemoteVideoStateReasonSdkInBackground";
  RemoteVideoStateReason[RemoteVideoStateReason["RemoteVideoStateReasonCodecNotSupport"] = 13] = "RemoteVideoStateReasonCodecNotSupport";
  return RemoteVideoStateReason;
}({});

/**
 * @ignore
 */
export let RemoteUserState = /*#__PURE__*/function (RemoteUserState) {
  RemoteUserState[RemoteUserState["UserStateMuteAudio"] = 1] = "UserStateMuteAudio";
  RemoteUserState[RemoteUserState["UserStateMuteVideo"] = 2] = "UserStateMuteVideo";
  RemoteUserState[RemoteUserState["UserStateEnableVideo"] = 16] = "UserStateEnableVideo";
  RemoteUserState[RemoteUserState["UserStateEnableLocalVideo"] = 256] = "UserStateEnableLocalVideo";
  return RemoteUserState;
}({});

/**
 * @ignore
 */
export class VideoTrackInfo {}

/**
 * @ignore
 */
export let RemoteVideoDownscaleLevel = /*#__PURE__*/function (RemoteVideoDownscaleLevel) {
  RemoteVideoDownscaleLevel[RemoteVideoDownscaleLevel["RemoteVideoDownscaleLevelNone"] = 0] = "RemoteVideoDownscaleLevelNone";
  RemoteVideoDownscaleLevel[RemoteVideoDownscaleLevel["RemoteVideoDownscaleLevel1"] = 1] = "RemoteVideoDownscaleLevel1";
  RemoteVideoDownscaleLevel[RemoteVideoDownscaleLevel["RemoteVideoDownscaleLevel2"] = 2] = "RemoteVideoDownscaleLevel2";
  RemoteVideoDownscaleLevel[RemoteVideoDownscaleLevel["RemoteVideoDownscaleLevel3"] = 3] = "RemoteVideoDownscaleLevel3";
  RemoteVideoDownscaleLevel[RemoteVideoDownscaleLevel["RemoteVideoDownscaleLevel4"] = 4] = "RemoteVideoDownscaleLevel4";
  return RemoteVideoDownscaleLevel;
}({});

/**
 * The volume information of users.
 */
export class AudioVolumeInfo {}

/**
 * The audio device information.
 *
 * This class is for Android only.
 */
export class DeviceInfo {}

/**
 * @ignore
 */
export class Packet {}

/**
 * The audio sampling rate of the stream to be pushed to the CDN.
 */
export let AudioSampleRateType = /*#__PURE__*/function (AudioSampleRateType) {
  AudioSampleRateType[AudioSampleRateType["AudioSampleRate32000"] = 32000] = "AudioSampleRate32000";
  AudioSampleRateType[AudioSampleRateType["AudioSampleRate44100"] = 44100] = "AudioSampleRate44100";
  AudioSampleRateType[AudioSampleRateType["AudioSampleRate48000"] = 48000] = "AudioSampleRate48000";
  return AudioSampleRateType;
}({});

/**
 * The codec type of the output video.
 */
export let VideoCodecTypeForStream = /*#__PURE__*/function (VideoCodecTypeForStream) {
  VideoCodecTypeForStream[VideoCodecTypeForStream["VideoCodecH264ForStream"] = 1] = "VideoCodecH264ForStream";
  VideoCodecTypeForStream[VideoCodecTypeForStream["VideoCodecH265ForStream"] = 2] = "VideoCodecH265ForStream";
  return VideoCodecTypeForStream;
}({});

/**
 * Video codec profile types.
 */
export let VideoCodecProfileType = /*#__PURE__*/function (VideoCodecProfileType) {
  VideoCodecProfileType[VideoCodecProfileType["VideoCodecProfileBaseline"] = 66] = "VideoCodecProfileBaseline";
  VideoCodecProfileType[VideoCodecProfileType["VideoCodecProfileMain"] = 77] = "VideoCodecProfileMain";
  VideoCodecProfileType[VideoCodecProfileType["VideoCodecProfileHigh"] = 100] = "VideoCodecProfileHigh";
  return VideoCodecProfileType;
}({});

/**
 * Self-defined audio codec profile.
 */
export let AudioCodecProfileType = /*#__PURE__*/function (AudioCodecProfileType) {
  AudioCodecProfileType[AudioCodecProfileType["AudioCodecProfileLcAac"] = 0] = "AudioCodecProfileLcAac";
  AudioCodecProfileType[AudioCodecProfileType["AudioCodecProfileHeAac"] = 1] = "AudioCodecProfileHeAac";
  AudioCodecProfileType[AudioCodecProfileType["AudioCodecProfileHeAacV2"] = 2] = "AudioCodecProfileHeAacV2";
  return AudioCodecProfileType;
}({});

/**
 * Local audio statistics.
 */
export class LocalAudioStats {}

/**
 * States of the Media Push.
 */
export let RtmpStreamPublishState = /*#__PURE__*/function (RtmpStreamPublishState) {
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateIdle"] = 0] = "RtmpStreamPublishStateIdle";
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateConnecting"] = 1] = "RtmpStreamPublishStateConnecting";
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateRunning"] = 2] = "RtmpStreamPublishStateRunning";
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateRecovering"] = 3] = "RtmpStreamPublishStateRecovering";
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateFailure"] = 4] = "RtmpStreamPublishStateFailure";
  RtmpStreamPublishState[RtmpStreamPublishState["RtmpStreamPublishStateDisconnecting"] = 5] = "RtmpStreamPublishStateDisconnecting";
  return RtmpStreamPublishState;
}({});

/**
 * Reasons for changes in the status of RTMP or RTMPS streaming.
 */
export let RtmpStreamPublishReason = /*#__PURE__*/function (RtmpStreamPublishReason) {
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonOk"] = 0] = "RtmpStreamPublishReasonOk";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonInvalidArgument"] = 1] = "RtmpStreamPublishReasonInvalidArgument";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonEncryptedStreamNotAllowed"] = 2] = "RtmpStreamPublishReasonEncryptedStreamNotAllowed";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonConnectionTimeout"] = 3] = "RtmpStreamPublishReasonConnectionTimeout";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonInternalServerError"] = 4] = "RtmpStreamPublishReasonInternalServerError";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonRtmpServerError"] = 5] = "RtmpStreamPublishReasonRtmpServerError";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonTooOften"] = 6] = "RtmpStreamPublishReasonTooOften";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonReachLimit"] = 7] = "RtmpStreamPublishReasonReachLimit";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonNotAuthorized"] = 8] = "RtmpStreamPublishReasonNotAuthorized";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonStreamNotFound"] = 9] = "RtmpStreamPublishReasonStreamNotFound";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonFormatNotSupported"] = 10] = "RtmpStreamPublishReasonFormatNotSupported";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonNotBroadcaster"] = 11] = "RtmpStreamPublishReasonNotBroadcaster";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonTranscodingNoMixStream"] = 13] = "RtmpStreamPublishReasonTranscodingNoMixStream";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonNetDown"] = 14] = "RtmpStreamPublishReasonNetDown";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonInvalidAppid"] = 15] = "RtmpStreamPublishReasonInvalidAppid";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamPublishReasonInvalidPrivilege"] = 16] = "RtmpStreamPublishReasonInvalidPrivilege";
  RtmpStreamPublishReason[RtmpStreamPublishReason["RtmpStreamUnpublishReasonOk"] = 100] = "RtmpStreamUnpublishReasonOk";
  return RtmpStreamPublishReason;
}({});

/**
 * Events during the Media Push.
 */
export let RtmpStreamingEvent = /*#__PURE__*/function (RtmpStreamingEvent) {
  RtmpStreamingEvent[RtmpStreamingEvent["RtmpStreamingEventFailedLoadImage"] = 1] = "RtmpStreamingEventFailedLoadImage";
  RtmpStreamingEvent[RtmpStreamingEvent["RtmpStreamingEventUrlAlreadyInUse"] = 2] = "RtmpStreamingEventUrlAlreadyInUse";
  RtmpStreamingEvent[RtmpStreamingEvent["RtmpStreamingEventAdvancedFeatureNotSupport"] = 3] = "RtmpStreamingEventAdvancedFeatureNotSupport";
  RtmpStreamingEvent[RtmpStreamingEvent["RtmpStreamingEventRequestTooOften"] = 4] = "RtmpStreamingEventRequestTooOften";
  return RtmpStreamingEvent;
}({});

/**
 * Image properties.
 *
 * This class sets the properties of the watermark and background images in the live video.
 */
export class RtcImage {}

/**
 * The configuration for advanced features of the RTMP or RTMPS streaming with transcoding.
 *
 * If you want to enable the advanced features of streaming with transcoding, contact.
 */
export class LiveStreamAdvancedFeature {}

/**
 * Connection states.
 */
export let ConnectionStateType = /*#__PURE__*/function (ConnectionStateType) {
  ConnectionStateType[ConnectionStateType["ConnectionStateDisconnected"] = 1] = "ConnectionStateDisconnected";
  ConnectionStateType[ConnectionStateType["ConnectionStateConnecting"] = 2] = "ConnectionStateConnecting";
  ConnectionStateType[ConnectionStateType["ConnectionStateConnected"] = 3] = "ConnectionStateConnected";
  ConnectionStateType[ConnectionStateType["ConnectionStateReconnecting"] = 4] = "ConnectionStateReconnecting";
  ConnectionStateType[ConnectionStateType["ConnectionStateFailed"] = 5] = "ConnectionStateFailed";
  return ConnectionStateType;
}({});

/**
 * Transcoding configurations of each host.
 */
export class TranscodingUser {}

/**
 * Transcoding configurations for Media Push.
 */
export class LiveTranscoding {}

/**
 * The video streams for local video mixing.
 */
export class TranscodingVideoStream {}

/**
 * The configuration of the video mixing on the local client.
 */
export class LocalTranscoderConfiguration {}

/**
 * The error code of the local video mixing failure.
 */
export let VideoTranscoderError = /*#__PURE__*/function (VideoTranscoderError) {
  VideoTranscoderError[VideoTranscoderError["VtErrVideoSourceNotReady"] = 1] = "VtErrVideoSourceNotReady";
  VideoTranscoderError[VideoTranscoderError["VtErrInvalidVideoSourceType"] = 2] = "VtErrInvalidVideoSourceType";
  VideoTranscoderError[VideoTranscoderError["VtErrInvalidImagePath"] = 3] = "VtErrInvalidImagePath";
  VideoTranscoderError[VideoTranscoderError["VtErrUnsupportImageFormat"] = 4] = "VtErrUnsupportImageFormat";
  VideoTranscoderError[VideoTranscoderError["VtErrInvalidLayout"] = 5] = "VtErrInvalidLayout";
  VideoTranscoderError[VideoTranscoderError["VtErrInternal"] = 20] = "VtErrInternal";
  return VideoTranscoderError;
}({});

/**
 * The source of the audio streams that are mixed locally.
 */
export class MixedAudioStream {}

/**
 * The configurations for mixing the lcoal audio.
 */
export class LocalAudioMixerConfiguration {}

/**
 * Configurations of the last-mile network test.
 */
export class LastmileProbeConfig {}

/**
 * The status of the last-mile probe test.
 */
export let LastmileProbeResultState = /*#__PURE__*/function (LastmileProbeResultState) {
  LastmileProbeResultState[LastmileProbeResultState["LastmileProbeResultComplete"] = 1] = "LastmileProbeResultComplete";
  LastmileProbeResultState[LastmileProbeResultState["LastmileProbeResultIncompleteNoBwe"] = 2] = "LastmileProbeResultIncompleteNoBwe";
  LastmileProbeResultState[LastmileProbeResultState["LastmileProbeResultUnavailable"] = 3] = "LastmileProbeResultUnavailable";
  return LastmileProbeResultState;
}({});

/**
 * Results of the uplink or downlink last-mile network test.
 */
export class LastmileProbeOneWayResult {}

/**
 * Results of the uplink and downlink last-mile network tests.
 */
export class LastmileProbeResult {}

/**
 * Reasons causing the change of the connection state.
 */
export let ConnectionChangedReasonType = /*#__PURE__*/function (ConnectionChangedReasonType) {
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedConnecting"] = 0] = "ConnectionChangedConnecting";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedJoinSuccess"] = 1] = "ConnectionChangedJoinSuccess";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedInterrupted"] = 2] = "ConnectionChangedInterrupted";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedBannedByServer"] = 3] = "ConnectionChangedBannedByServer";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedJoinFailed"] = 4] = "ConnectionChangedJoinFailed";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedLeaveChannel"] = 5] = "ConnectionChangedLeaveChannel";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedInvalidAppId"] = 6] = "ConnectionChangedInvalidAppId";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedInvalidChannelName"] = 7] = "ConnectionChangedInvalidChannelName";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedInvalidToken"] = 8] = "ConnectionChangedInvalidToken";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedTokenExpired"] = 9] = "ConnectionChangedTokenExpired";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedRejectedByServer"] = 10] = "ConnectionChangedRejectedByServer";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedSettingProxyServer"] = 11] = "ConnectionChangedSettingProxyServer";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedRenewToken"] = 12] = "ConnectionChangedRenewToken";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedClientIpAddressChanged"] = 13] = "ConnectionChangedClientIpAddressChanged";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedKeepAliveTimeout"] = 14] = "ConnectionChangedKeepAliveTimeout";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedRejoinSuccess"] = 15] = "ConnectionChangedRejoinSuccess";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedLost"] = 16] = "ConnectionChangedLost";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedEchoTest"] = 17] = "ConnectionChangedEchoTest";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedClientIpAddressChangedByUser"] = 18] = "ConnectionChangedClientIpAddressChangedByUser";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedSameUidLogin"] = 19] = "ConnectionChangedSameUidLogin";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedTooManyBroadcasters"] = 20] = "ConnectionChangedTooManyBroadcasters";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedLicenseValidationFailure"] = 21] = "ConnectionChangedLicenseValidationFailure";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedCertificationVeryfyFailure"] = 22] = "ConnectionChangedCertificationVeryfyFailure";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedStreamChannelNotAvailable"] = 23] = "ConnectionChangedStreamChannelNotAvailable";
  ConnectionChangedReasonType[ConnectionChangedReasonType["ConnectionChangedInconsistentAppid"] = 24] = "ConnectionChangedInconsistentAppid";
  return ConnectionChangedReasonType;
}({});

/**
 * The reason for a user role switch failure.
 */
export let ClientRoleChangeFailedReason = /*#__PURE__*/function (ClientRoleChangeFailedReason) {
  ClientRoleChangeFailedReason[ClientRoleChangeFailedReason["ClientRoleChangeFailedTooManyBroadcasters"] = 1] = "ClientRoleChangeFailedTooManyBroadcasters";
  ClientRoleChangeFailedReason[ClientRoleChangeFailedReason["ClientRoleChangeFailedNotAuthorized"] = 2] = "ClientRoleChangeFailedNotAuthorized";
  ClientRoleChangeFailedReason[ClientRoleChangeFailedReason["ClientRoleChangeFailedRequestTimeOut"] = 3] = "ClientRoleChangeFailedRequestTimeOut";
  ClientRoleChangeFailedReason[ClientRoleChangeFailedReason["ClientRoleChangeFailedConnectionFailed"] = 4] = "ClientRoleChangeFailedConnectionFailed";
  return ClientRoleChangeFailedReason;
}({});

/**
 * @ignore
 */
export let WlaccMessageReason = /*#__PURE__*/function (WlaccMessageReason) {
  WlaccMessageReason[WlaccMessageReason["WlaccMessageReasonWeakSignal"] = 0] = "WlaccMessageReasonWeakSignal";
  WlaccMessageReason[WlaccMessageReason["WlaccMessageReasonChannelCongestion"] = 1] = "WlaccMessageReasonChannelCongestion";
  return WlaccMessageReason;
}({});

/**
 * @ignore
 */
export let WlaccSuggestAction = /*#__PURE__*/function (WlaccSuggestAction) {
  WlaccSuggestAction[WlaccSuggestAction["WlaccSuggestActionCloseToWifi"] = 0] = "WlaccSuggestActionCloseToWifi";
  WlaccSuggestAction[WlaccSuggestAction["WlaccSuggestActionConnectSsid"] = 1] = "WlaccSuggestActionConnectSsid";
  WlaccSuggestAction[WlaccSuggestAction["WlaccSuggestActionCheck5g"] = 2] = "WlaccSuggestActionCheck5g";
  WlaccSuggestAction[WlaccSuggestAction["WlaccSuggestActionModifySsid"] = 3] = "WlaccSuggestActionModifySsid";
  return WlaccSuggestAction;
}({});

/**
 * @ignore
 */
export class WlAccStats {}

/**
 * Network type.
 */
export let NetworkType = /*#__PURE__*/function (NetworkType) {
  NetworkType[NetworkType["NetworkTypeUnknown"] = -1] = "NetworkTypeUnknown";
  NetworkType[NetworkType["NetworkTypeDisconnected"] = 0] = "NetworkTypeDisconnected";
  NetworkType[NetworkType["NetworkTypeLan"] = 1] = "NetworkTypeLan";
  NetworkType[NetworkType["NetworkTypeWifi"] = 2] = "NetworkTypeWifi";
  NetworkType[NetworkType["NetworkTypeMobile2g"] = 3] = "NetworkTypeMobile2g";
  NetworkType[NetworkType["NetworkTypeMobile3g"] = 4] = "NetworkTypeMobile3g";
  NetworkType[NetworkType["NetworkTypeMobile4g"] = 5] = "NetworkTypeMobile4g";
  NetworkType[NetworkType["NetworkTypeMobile5g"] = 6] = "NetworkTypeMobile5g";
  return NetworkType;
}({});

/**
 * Setting mode of the view.
 */
export let VideoViewSetupMode = /*#__PURE__*/function (VideoViewSetupMode) {
  VideoViewSetupMode[VideoViewSetupMode["VideoViewSetupReplace"] = 0] = "VideoViewSetupReplace";
  VideoViewSetupMode[VideoViewSetupMode["VideoViewSetupAdd"] = 1] = "VideoViewSetupAdd";
  VideoViewSetupMode[VideoViewSetupMode["VideoViewSetupRemove"] = 2] = "VideoViewSetupRemove";
  return VideoViewSetupMode;
}({});

/**
 * Attributes of the video canvas object.
 */
export class VideoCanvas {}

/**
 * The contrast level.
 */
export let LighteningContrastLevel = /*#__PURE__*/function (LighteningContrastLevel) {
  LighteningContrastLevel[LighteningContrastLevel["LighteningContrastLow"] = 0] = "LighteningContrastLow";
  LighteningContrastLevel[LighteningContrastLevel["LighteningContrastNormal"] = 1] = "LighteningContrastNormal";
  LighteningContrastLevel[LighteningContrastLevel["LighteningContrastHigh"] = 2] = "LighteningContrastHigh";
  return LighteningContrastLevel;
}({});

/**
 * Image enhancement options.
 */
export class BeautyOptions {}

/**
 * @ignore
 */
export let FaceShapeArea = /*#__PURE__*/function (FaceShapeArea) {
  FaceShapeArea[FaceShapeArea["FaceShapeAreaNone"] = -1] = "FaceShapeAreaNone";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaHeadscale"] = 0] = "FaceShapeAreaHeadscale";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaForehead"] = 1] = "FaceShapeAreaForehead";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaFacecontour"] = 2] = "FaceShapeAreaFacecontour";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaFacelength"] = 3] = "FaceShapeAreaFacelength";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaFacewidth"] = 4] = "FaceShapeAreaFacewidth";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaCheekbone"] = 5] = "FaceShapeAreaCheekbone";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaCheek"] = 6] = "FaceShapeAreaCheek";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaChin"] = 7] = "FaceShapeAreaChin";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaEyescale"] = 8] = "FaceShapeAreaEyescale";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaNoselength"] = 9] = "FaceShapeAreaNoselength";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaNosewidth"] = 10] = "FaceShapeAreaNosewidth";
  FaceShapeArea[FaceShapeArea["FaceShapeAreaMouthscale"] = 11] = "FaceShapeAreaMouthscale";
  return FaceShapeArea;
}({});

/**
 * @ignore
 */
export class FaceShapeAreaOptions {}

/**
 * @ignore
 */
export let FaceShapeBeautyStyle = /*#__PURE__*/function (FaceShapeBeautyStyle) {
  FaceShapeBeautyStyle[FaceShapeBeautyStyle["FaceShapeBeautyStyleFemale"] = 0] = "FaceShapeBeautyStyleFemale";
  FaceShapeBeautyStyle[FaceShapeBeautyStyle["FaceShapeBeautyStyleMale"] = 1] = "FaceShapeBeautyStyleMale";
  return FaceShapeBeautyStyle;
}({});

/**
 * @ignore
 */
export class FaceShapeBeautyOptions {}

/**
 * Filter effect options.
 */
export class FilterEffectOptions {}

/**
 * The low-light enhancement mode.
 */
export let LowLightEnhanceMode = /*#__PURE__*/function (LowLightEnhanceMode) {
  LowLightEnhanceMode[LowLightEnhanceMode["LowLightEnhanceAuto"] = 0] = "LowLightEnhanceAuto";
  LowLightEnhanceMode[LowLightEnhanceMode["LowLightEnhanceManual"] = 1] = "LowLightEnhanceManual";
  return LowLightEnhanceMode;
}({});

/**
 * The low-light enhancement level.
 */
export let LowLightEnhanceLevel = /*#__PURE__*/function (LowLightEnhanceLevel) {
  LowLightEnhanceLevel[LowLightEnhanceLevel["LowLightEnhanceLevelHighQuality"] = 0] = "LowLightEnhanceLevelHighQuality";
  LowLightEnhanceLevel[LowLightEnhanceLevel["LowLightEnhanceLevelFast"] = 1] = "LowLightEnhanceLevelFast";
  return LowLightEnhanceLevel;
}({});

/**
 * The low-light enhancement options.
 */
export class LowlightEnhanceOptions {}

/**
 * Video noise reduction mode.
 */
export let VideoDenoiserMode = /*#__PURE__*/function (VideoDenoiserMode) {
  VideoDenoiserMode[VideoDenoiserMode["VideoDenoiserAuto"] = 0] = "VideoDenoiserAuto";
  VideoDenoiserMode[VideoDenoiserMode["VideoDenoiserManual"] = 1] = "VideoDenoiserManual";
  return VideoDenoiserMode;
}({});

/**
 * Video noise reduction level.
 */
export let VideoDenoiserLevel = /*#__PURE__*/function (VideoDenoiserLevel) {
  VideoDenoiserLevel[VideoDenoiserLevel["VideoDenoiserLevelHighQuality"] = 0] = "VideoDenoiserLevelHighQuality";
  VideoDenoiserLevel[VideoDenoiserLevel["VideoDenoiserLevelFast"] = 1] = "VideoDenoiserLevelFast";
  return VideoDenoiserLevel;
}({});

/**
 * Video noise reduction options.
 */
export class VideoDenoiserOptions {}

/**
 * The color enhancement options.
 */
export class ColorEnhanceOptions {}

/**
 * The custom background.
 */
export let BackgroundSourceType = /*#__PURE__*/function (BackgroundSourceType) {
  BackgroundSourceType[BackgroundSourceType["BackgroundNone"] = 0] = "BackgroundNone";
  BackgroundSourceType[BackgroundSourceType["BackgroundColor"] = 1] = "BackgroundColor";
  BackgroundSourceType[BackgroundSourceType["BackgroundImg"] = 2] = "BackgroundImg";
  BackgroundSourceType[BackgroundSourceType["BackgroundBlur"] = 3] = "BackgroundBlur";
  BackgroundSourceType[BackgroundSourceType["BackgroundVideo"] = 4] = "BackgroundVideo";
  return BackgroundSourceType;
}({});

/**
 * The degree of blurring applied to the custom background image.
 */
export let BackgroundBlurDegree = /*#__PURE__*/function (BackgroundBlurDegree) {
  BackgroundBlurDegree[BackgroundBlurDegree["BlurDegreeLow"] = 1] = "BlurDegreeLow";
  BackgroundBlurDegree[BackgroundBlurDegree["BlurDegreeMedium"] = 2] = "BlurDegreeMedium";
  BackgroundBlurDegree[BackgroundBlurDegree["BlurDegreeHigh"] = 3] = "BlurDegreeHigh";
  return BackgroundBlurDegree;
}({});

/**
 * The custom background.
 */
export class VirtualBackgroundSource {}

/**
 * The type of algorithms to user for background processing.
 */
export let SegModelType = /*#__PURE__*/function (SegModelType) {
  SegModelType[SegModelType["SegModelAi"] = 1] = "SegModelAi";
  SegModelType[SegModelType["SegModelGreen"] = 2] = "SegModelGreen";
  return SegModelType;
}({});

/**
 * Processing properties for background images.
 */
export class SegmentationProperty {}

/**
 * The type of the audio track.
 */
export let AudioTrackType = /*#__PURE__*/function (AudioTrackType) {
  AudioTrackType[AudioTrackType["AudioTrackInvalid"] = -1] = "AudioTrackInvalid";
  AudioTrackType[AudioTrackType["AudioTrackMixable"] = 0] = "AudioTrackMixable";
  AudioTrackType[AudioTrackType["AudioTrackDirect"] = 1] = "AudioTrackDirect";
  return AudioTrackType;
}({});

/**
 * The configuration of custom audio tracks.
 */
export class AudioTrackConfig {}

/**
 * The options for SDK preset voice beautifier effects.
 */
export let VoiceBeautifierPreset = /*#__PURE__*/function (VoiceBeautifierPreset) {
  VoiceBeautifierPreset[VoiceBeautifierPreset["VoiceBeautifierOff"] = 0] = "VoiceBeautifierOff";
  VoiceBeautifierPreset[VoiceBeautifierPreset["ChatBeautifierMagnetic"] = 16843008] = "ChatBeautifierMagnetic";
  VoiceBeautifierPreset[VoiceBeautifierPreset["ChatBeautifierFresh"] = 16843264] = "ChatBeautifierFresh";
  VoiceBeautifierPreset[VoiceBeautifierPreset["ChatBeautifierVitality"] = 16843520] = "ChatBeautifierVitality";
  VoiceBeautifierPreset[VoiceBeautifierPreset["SingingBeautifier"] = 16908544] = "SingingBeautifier";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationVigorous"] = 16974080] = "TimbreTransformationVigorous";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationDeep"] = 16974336] = "TimbreTransformationDeep";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationMellow"] = 16974592] = "TimbreTransformationMellow";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationFalsetto"] = 16974848] = "TimbreTransformationFalsetto";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationFull"] = 16975104] = "TimbreTransformationFull";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationClear"] = 16975360] = "TimbreTransformationClear";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationResounding"] = 16975616] = "TimbreTransformationResounding";
  VoiceBeautifierPreset[VoiceBeautifierPreset["TimbreTransformationRinging"] = 16975872] = "TimbreTransformationRinging";
  VoiceBeautifierPreset[VoiceBeautifierPreset["UltraHighQualityVoice"] = 17039616] = "UltraHighQualityVoice";
  return VoiceBeautifierPreset;
}({});

/**
 * Preset audio effects.
 *
 * To get better audio effects, Agora recommends calling setAudioProfile and setting the profile parameter as recommended below before using the preset audio effects.
 */
export let AudioEffectPreset = /*#__PURE__*/function (AudioEffectPreset) {
  AudioEffectPreset[AudioEffectPreset["AudioEffectOff"] = 0] = "AudioEffectOff";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsKtv"] = 33620224] = "RoomAcousticsKtv";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsVocalConcert"] = 33620480] = "RoomAcousticsVocalConcert";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsStudio"] = 33620736] = "RoomAcousticsStudio";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsPhonograph"] = 33620992] = "RoomAcousticsPhonograph";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsVirtualStereo"] = 33621248] = "RoomAcousticsVirtualStereo";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsSpacial"] = 33621504] = "RoomAcousticsSpacial";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsEthereal"] = 33621760] = "RoomAcousticsEthereal";
  AudioEffectPreset[AudioEffectPreset["RoomAcoustics3dVoice"] = 33622016] = "RoomAcoustics3dVoice";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsVirtualSurroundSound"] = 33622272] = "RoomAcousticsVirtualSurroundSound";
  AudioEffectPreset[AudioEffectPreset["RoomAcousticsChorus"] = 33623296] = "RoomAcousticsChorus";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectUncle"] = 33685760] = "VoiceChangerEffectUncle";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectOldman"] = 33686016] = "VoiceChangerEffectOldman";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectBoy"] = 33686272] = "VoiceChangerEffectBoy";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectSister"] = 33686528] = "VoiceChangerEffectSister";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectGirl"] = 33686784] = "VoiceChangerEffectGirl";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectPigking"] = 33687040] = "VoiceChangerEffectPigking";
  AudioEffectPreset[AudioEffectPreset["VoiceChangerEffectHulk"] = 33687296] = "VoiceChangerEffectHulk";
  AudioEffectPreset[AudioEffectPreset["StyleTransformationRnb"] = 33751296] = "StyleTransformationRnb";
  AudioEffectPreset[AudioEffectPreset["StyleTransformationPopular"] = 33751552] = "StyleTransformationPopular";
  AudioEffectPreset[AudioEffectPreset["PitchCorrection"] = 33816832] = "PitchCorrection";
  return AudioEffectPreset;
}({});

/**
 * The options for SDK preset voice conversion effects.
 */
export let VoiceConversionPreset = /*#__PURE__*/function (VoiceConversionPreset) {
  VoiceConversionPreset[VoiceConversionPreset["VoiceConversionOff"] = 0] = "VoiceConversionOff";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerNeutral"] = 50397440] = "VoiceChangerNeutral";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerSweet"] = 50397696] = "VoiceChangerSweet";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerSolid"] = 50397952] = "VoiceChangerSolid";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerBass"] = 50398208] = "VoiceChangerBass";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerCartoon"] = 50398464] = "VoiceChangerCartoon";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerChildlike"] = 50398720] = "VoiceChangerChildlike";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerPhoneOperator"] = 50398976] = "VoiceChangerPhoneOperator";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerMonster"] = 50399232] = "VoiceChangerMonster";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerTransformers"] = 50399488] = "VoiceChangerTransformers";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerGroot"] = 50399744] = "VoiceChangerGroot";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerDarthVader"] = 50400000] = "VoiceChangerDarthVader";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerIronLady"] = 50400256] = "VoiceChangerIronLady";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerShinChan"] = 50400512] = "VoiceChangerShinChan";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerGirlishMan"] = 50400768] = "VoiceChangerGirlishMan";
  VoiceConversionPreset[VoiceConversionPreset["VoiceChangerChipmunk"] = 50401024] = "VoiceChangerChipmunk";
  return VoiceConversionPreset;
}({});

/**
 * Preset headphone equalizer types.
 */
export let HeadphoneEqualizerPreset = /*#__PURE__*/function (HeadphoneEqualizerPreset) {
  HeadphoneEqualizerPreset[HeadphoneEqualizerPreset["HeadphoneEqualizerOff"] = 0] = "HeadphoneEqualizerOff";
  HeadphoneEqualizerPreset[HeadphoneEqualizerPreset["HeadphoneEqualizerOverear"] = 67108865] = "HeadphoneEqualizerOverear";
  HeadphoneEqualizerPreset[HeadphoneEqualizerPreset["HeadphoneEqualizerInear"] = 67108866] = "HeadphoneEqualizerInear";
  return HeadphoneEqualizerPreset;
}({});

/**
 * Voice AI tuner sound types.
 */
export let VoiceAiTunerType = /*#__PURE__*/function (VoiceAiTunerType) {
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerMatureMale"] = 0] = "VoiceAiTunerMatureMale";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerFreshMale"] = 1] = "VoiceAiTunerFreshMale";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerElegantFemale"] = 2] = "VoiceAiTunerElegantFemale";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerSweetFemale"] = 3] = "VoiceAiTunerSweetFemale";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerWarmMaleSinging"] = 4] = "VoiceAiTunerWarmMaleSinging";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerGentleFemaleSinging"] = 5] = "VoiceAiTunerGentleFemaleSinging";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerHuskyMaleSinging"] = 6] = "VoiceAiTunerHuskyMaleSinging";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerWarmElegantFemaleSinging"] = 7] = "VoiceAiTunerWarmElegantFemaleSinging";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerPowerfulMaleSinging"] = 8] = "VoiceAiTunerPowerfulMaleSinging";
  VoiceAiTunerType[VoiceAiTunerType["VoiceAiTunerDreamyFemaleSinging"] = 9] = "VoiceAiTunerDreamyFemaleSinging";
  return VoiceAiTunerType;
}({});

/**
 * @ignore
 */
export class ScreenCaptureParameters {}

/**
 * Recording quality.
 */
export let AudioRecordingQualityType = /*#__PURE__*/function (AudioRecordingQualityType) {
  AudioRecordingQualityType[AudioRecordingQualityType["AudioRecordingQualityLow"] = 0] = "AudioRecordingQualityLow";
  AudioRecordingQualityType[AudioRecordingQualityType["AudioRecordingQualityMedium"] = 1] = "AudioRecordingQualityMedium";
  AudioRecordingQualityType[AudioRecordingQualityType["AudioRecordingQualityHigh"] = 2] = "AudioRecordingQualityHigh";
  AudioRecordingQualityType[AudioRecordingQualityType["AudioRecordingQualityUltraHigh"] = 3] = "AudioRecordingQualityUltraHigh";
  return AudioRecordingQualityType;
}({});

/**
 * Recording content. Set in startAudioRecording.
 */
export let AudioFileRecordingType = /*#__PURE__*/function (AudioFileRecordingType) {
  AudioFileRecordingType[AudioFileRecordingType["AudioFileRecordingMic"] = 1] = "AudioFileRecordingMic";
  AudioFileRecordingType[AudioFileRecordingType["AudioFileRecordingPlayback"] = 2] = "AudioFileRecordingPlayback";
  AudioFileRecordingType[AudioFileRecordingType["AudioFileRecordingMixed"] = 3] = "AudioFileRecordingMixed";
  return AudioFileRecordingType;
}({});

/**
 * Audio profile.
 */
export let AudioEncodedFrameObserverPosition = /*#__PURE__*/function (AudioEncodedFrameObserverPosition) {
  AudioEncodedFrameObserverPosition[AudioEncodedFrameObserverPosition["AudioEncodedFrameObserverPositionRecord"] = 1] = "AudioEncodedFrameObserverPositionRecord";
  AudioEncodedFrameObserverPosition[AudioEncodedFrameObserverPosition["AudioEncodedFrameObserverPositionPlayback"] = 2] = "AudioEncodedFrameObserverPositionPlayback";
  AudioEncodedFrameObserverPosition[AudioEncodedFrameObserverPosition["AudioEncodedFrameObserverPositionMixed"] = 3] = "AudioEncodedFrameObserverPositionMixed";
  return AudioEncodedFrameObserverPosition;
}({});

/**
 * Recording configurations.
 */
export class AudioRecordingConfiguration {}

/**
 * Observer settings for the encoded audio.
 */
export class AudioEncodedFrameObserverConfig {}

/**
 * The encoded audio observer.
 */

/**
 * The region for connection, which is the region where the server the SDK connects to is located.
 */
export let AreaCode = /*#__PURE__*/function (AreaCode) {
  AreaCode[AreaCode["AreaCodeCn"] = 1] = "AreaCodeCn";
  AreaCode[AreaCode["AreaCodeNa"] = 2] = "AreaCodeNa";
  AreaCode[AreaCode["AreaCodeEu"] = 4] = "AreaCodeEu";
  AreaCode[AreaCode["AreaCodeAs"] = 8] = "AreaCodeAs";
  AreaCode[AreaCode["AreaCodeJp"] = 16] = "AreaCodeJp";
  AreaCode[AreaCode["AreaCodeIn"] = 32] = "AreaCodeIn";
  AreaCode[AreaCode["AreaCodeGlob"] = 4294967295] = "AreaCodeGlob";
  return AreaCode;
}({});

/**
 * @ignore
 */
export let AreaCodeEx = /*#__PURE__*/function (AreaCodeEx) {
  AreaCodeEx[AreaCodeEx["AreaCodeOc"] = 64] = "AreaCodeOc";
  AreaCodeEx[AreaCodeEx["AreaCodeSa"] = 128] = "AreaCodeSa";
  AreaCodeEx[AreaCodeEx["AreaCodeAf"] = 256] = "AreaCodeAf";
  AreaCodeEx[AreaCodeEx["AreaCodeKr"] = 512] = "AreaCodeKr";
  AreaCodeEx[AreaCodeEx["AreaCodeHkmc"] = 1024] = "AreaCodeHkmc";
  AreaCodeEx[AreaCodeEx["AreaCodeUs"] = 2048] = "AreaCodeUs";
  AreaCodeEx[AreaCodeEx["AreaCodeRu"] = 4096] = "AreaCodeRu";
  AreaCodeEx[AreaCodeEx["AreaCodeOvs"] = 4294967294] = "AreaCodeOvs";
  return AreaCodeEx;
}({});

/**
 * The error code of the channel media relay.
 */
export let ChannelMediaRelayError = /*#__PURE__*/function (ChannelMediaRelayError) {
  ChannelMediaRelayError[ChannelMediaRelayError["RelayOk"] = 0] = "RelayOk";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorServerErrorResponse"] = 1] = "RelayErrorServerErrorResponse";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorServerNoResponse"] = 2] = "RelayErrorServerNoResponse";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorNoResourceAvailable"] = 3] = "RelayErrorNoResourceAvailable";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorFailedJoinSrc"] = 4] = "RelayErrorFailedJoinSrc";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorFailedJoinDest"] = 5] = "RelayErrorFailedJoinDest";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorFailedPacketReceivedFromSrc"] = 6] = "RelayErrorFailedPacketReceivedFromSrc";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorFailedPacketSentToDest"] = 7] = "RelayErrorFailedPacketSentToDest";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorServerConnectionLost"] = 8] = "RelayErrorServerConnectionLost";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorInternalError"] = 9] = "RelayErrorInternalError";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorSrcTokenExpired"] = 10] = "RelayErrorSrcTokenExpired";
  ChannelMediaRelayError[ChannelMediaRelayError["RelayErrorDestTokenExpired"] = 11] = "RelayErrorDestTokenExpired";
  return ChannelMediaRelayError;
}({});

/**
 * The state code of the channel media relay.
 */
export let ChannelMediaRelayState = /*#__PURE__*/function (ChannelMediaRelayState) {
  ChannelMediaRelayState[ChannelMediaRelayState["RelayStateIdle"] = 0] = "RelayStateIdle";
  ChannelMediaRelayState[ChannelMediaRelayState["RelayStateConnecting"] = 1] = "RelayStateConnecting";
  ChannelMediaRelayState[ChannelMediaRelayState["RelayStateRunning"] = 2] = "RelayStateRunning";
  ChannelMediaRelayState[ChannelMediaRelayState["RelayStateFailure"] = 3] = "RelayStateFailure";
  return ChannelMediaRelayState;
}({});

/**
 * Channel media information.
 */
export class ChannelMediaInfo {}

/**
 * Configuration of cross channel media relay.
 */
export class ChannelMediaRelayConfiguration {}

/**
 * The uplink network information.
 */
export class UplinkNetworkInfo {}

/**
 * @ignore
 */
export class PeerDownlinkInfo {}

/**
 * @ignore
 */
export class DownlinkNetworkInfo {}

/**
 * The built-in encryption mode.
 *
 * Agora recommends using Aes128Gcm2 or Aes256Gcm2 encrypted mode. These two modes support the use of salt for higher security.
 */
export let EncryptionMode = /*#__PURE__*/function (EncryptionMode) {
  EncryptionMode[EncryptionMode["Aes128Xts"] = 1] = "Aes128Xts";
  EncryptionMode[EncryptionMode["Aes128Ecb"] = 2] = "Aes128Ecb";
  EncryptionMode[EncryptionMode["Aes256Xts"] = 3] = "Aes256Xts";
  EncryptionMode[EncryptionMode["Sm4128Ecb"] = 4] = "Sm4128Ecb";
  EncryptionMode[EncryptionMode["Aes128Gcm"] = 5] = "Aes128Gcm";
  EncryptionMode[EncryptionMode["Aes256Gcm"] = 6] = "Aes256Gcm";
  EncryptionMode[EncryptionMode["Aes128Gcm2"] = 7] = "Aes128Gcm2";
  EncryptionMode[EncryptionMode["Aes256Gcm2"] = 8] = "Aes256Gcm2";
  EncryptionMode[EncryptionMode["ModeEnd"] = 9] = "ModeEnd";
  return EncryptionMode;
}({});

/**
 * Built-in encryption configurations.
 */
export class EncryptionConfig {}

/**
 * Encryption error type.
 */
export let EncryptionErrorType = /*#__PURE__*/function (EncryptionErrorType) {
  EncryptionErrorType[EncryptionErrorType["EncryptionErrorInternalFailure"] = 0] = "EncryptionErrorInternalFailure";
  EncryptionErrorType[EncryptionErrorType["EncryptionErrorDecryptionFailure"] = 1] = "EncryptionErrorDecryptionFailure";
  EncryptionErrorType[EncryptionErrorType["EncryptionErrorEncryptionFailure"] = 2] = "EncryptionErrorEncryptionFailure";
  EncryptionErrorType[EncryptionErrorType["EncryptionErrorDatastreamDecryptionFailure"] = 3] = "EncryptionErrorDatastreamDecryptionFailure";
  EncryptionErrorType[EncryptionErrorType["EncryptionErrorDatastreamEncryptionFailure"] = 4] = "EncryptionErrorDatastreamEncryptionFailure";
  return EncryptionErrorType;
}({});

/**
 * @ignore
 */
export let UploadErrorReason = /*#__PURE__*/function (UploadErrorReason) {
  UploadErrorReason[UploadErrorReason["UploadSuccess"] = 0] = "UploadSuccess";
  UploadErrorReason[UploadErrorReason["UploadNetError"] = 1] = "UploadNetError";
  UploadErrorReason[UploadErrorReason["UploadServerError"] = 2] = "UploadServerError";
  return UploadErrorReason;
}({});

/**
 * The type of the device permission.
 */
export let PermissionType = /*#__PURE__*/function (PermissionType) {
  PermissionType[PermissionType["RecordAudio"] = 0] = "RecordAudio";
  PermissionType[PermissionType["Camera"] = 1] = "Camera";
  PermissionType[PermissionType["ScreenCapture"] = 2] = "ScreenCapture";
  return PermissionType;
}({});

/**
 * The subscribing state.
 */
export let StreamSubscribeState = /*#__PURE__*/function (StreamSubscribeState) {
  StreamSubscribeState[StreamSubscribeState["SubStateIdle"] = 0] = "SubStateIdle";
  StreamSubscribeState[StreamSubscribeState["SubStateNoSubscribed"] = 1] = "SubStateNoSubscribed";
  StreamSubscribeState[StreamSubscribeState["SubStateSubscribing"] = 2] = "SubStateSubscribing";
  StreamSubscribeState[StreamSubscribeState["SubStateSubscribed"] = 3] = "SubStateSubscribed";
  return StreamSubscribeState;
}({});

/**
 * The publishing state.
 */
export let StreamPublishState = /*#__PURE__*/function (StreamPublishState) {
  StreamPublishState[StreamPublishState["PubStateIdle"] = 0] = "PubStateIdle";
  StreamPublishState[StreamPublishState["PubStateNoPublished"] = 1] = "PubStateNoPublished";
  StreamPublishState[StreamPublishState["PubStatePublishing"] = 2] = "PubStatePublishing";
  StreamPublishState[StreamPublishState["PubStatePublished"] = 3] = "PubStatePublished";
  return StreamPublishState;
}({});

/**
 * The configuration of the audio and video call loop test.
 */
export class EchoTestConfiguration {}

/**
 * The information of the user.
 */
export class UserInfo {}

/**
 * The audio filter types of in-ear monitoring.
 */
export let EarMonitoringFilterType = /*#__PURE__*/function (EarMonitoringFilterType) {
  EarMonitoringFilterType[EarMonitoringFilterType["EarMonitoringFilterNone"] = 1] = "EarMonitoringFilterNone";
  EarMonitoringFilterType[EarMonitoringFilterType["EarMonitoringFilterBuiltInAudioFilters"] = 2] = "EarMonitoringFilterBuiltInAudioFilters";
  EarMonitoringFilterType[EarMonitoringFilterType["EarMonitoringFilterNoiseSuppression"] = 4] = "EarMonitoringFilterNoiseSuppression";
  EarMonitoringFilterType[EarMonitoringFilterType["EarMonitoringFilterReusePostProcessingFilter"] = 32768] = "EarMonitoringFilterReusePostProcessingFilter";
  return EarMonitoringFilterType;
}({});

/**
 * @ignore
 */
export let ThreadPriorityType = /*#__PURE__*/function (ThreadPriorityType) {
  ThreadPriorityType[ThreadPriorityType["Lowest"] = 0] = "Lowest";
  ThreadPriorityType[ThreadPriorityType["Low"] = 1] = "Low";
  ThreadPriorityType[ThreadPriorityType["Normal"] = 2] = "Normal";
  ThreadPriorityType[ThreadPriorityType["High"] = 3] = "High";
  ThreadPriorityType[ThreadPriorityType["Highest"] = 4] = "Highest";
  ThreadPriorityType[ThreadPriorityType["Critical"] = 5] = "Critical";
  return ThreadPriorityType;
}({});

/**
 * The video configuration for the shared screen stream.
 */
export class ScreenVideoParameters {}

/**
 * The audio configuration for the shared screen stream.
 *
 * Only available where captureAudio is true.
 */
export class ScreenAudioParameters {}

/**
 * Screen sharing configurations.
 */
export class ScreenCaptureParameters2 {}

/**
 * The rendering state of the media frame.
 */
export let MediaTraceEvent = /*#__PURE__*/function (MediaTraceEvent) {
  MediaTraceEvent[MediaTraceEvent["MediaTraceEventVideoRendered"] = 0] = "MediaTraceEventVideoRendered";
  MediaTraceEvent[MediaTraceEvent["MediaTraceEventVideoDecoded"] = 1] = "MediaTraceEventVideoDecoded";
  return MediaTraceEvent;
}({});

/**
 * Indicators during video frame rendering progress.
 */
export class VideoRenderingTracingInfo {}

/**
 * @ignore
 */
export let ConfigFetchType = /*#__PURE__*/function (ConfigFetchType) {
  ConfigFetchType[ConfigFetchType["ConfigFetchTypeInitialize"] = 1] = "ConfigFetchTypeInitialize";
  ConfigFetchType[ConfigFetchType["ConfigFetchTypeJoinChannel"] = 2] = "ConfigFetchTypeJoinChannel";
  return ConfigFetchType;
}({});

/**
 * @ignore
 */
export let LocalProxyMode = /*#__PURE__*/function (LocalProxyMode) {
  LocalProxyMode[LocalProxyMode["ConnectivityFirst"] = 0] = "ConnectivityFirst";
  LocalProxyMode[LocalProxyMode["LocalOnly"] = 1] = "LocalOnly";
  return LocalProxyMode;
}({});

/**
 * @ignore
 */
export class LogUploadServerInfo {}

/**
 * @ignore
 */
export class AdvancedConfigInfo {}

/**
 * @ignore
 */
export class LocalAccessPointConfiguration {}

/**
 * @ignore
 */
export let RecorderStreamType = /*#__PURE__*/function (RecorderStreamType) {
  RecorderStreamType[RecorderStreamType["Rtc"] = 0] = "Rtc";
  RecorderStreamType[RecorderStreamType["Preview"] = 1] = "Preview";
  return RecorderStreamType;
}({});

/**
 * @ignore
 */
export class RecorderStreamInfo {}

/**
 * The spatial audio parameters.
 */
export class SpatialAudioParams {}

/**
 * Layout information of a specific sub-video stream within the mixed stream.
 */
export class VideoLayout {}
//# sourceMappingURL=AgoraBase.js.map