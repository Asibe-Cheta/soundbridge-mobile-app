import './extension/IAgoraH265TranscoderExtension';

/* enum_H265TranscodeResult */
export let H265TranscodeResult = /*#__PURE__*/function (H265TranscodeResult) {
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultUnknown"] = -1] = "H265TranscodeResultUnknown";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultSuccess"] = 0] = "H265TranscodeResultSuccess";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultRequestInvalid"] = 1] = "H265TranscodeResultRequestInvalid";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultUnauthorized"] = 2] = "H265TranscodeResultUnauthorized";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultTokenExpired"] = 3] = "H265TranscodeResultTokenExpired";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultForbidden"] = 4] = "H265TranscodeResultForbidden";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultNotFound"] = 5] = "H265TranscodeResultNotFound";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultConflicted"] = 6] = "H265TranscodeResultConflicted";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultNotSupported"] = 7] = "H265TranscodeResultNotSupported";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultTooOften"] = 8] = "H265TranscodeResultTooOften";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultServerInternalError"] = 9] = "H265TranscodeResultServerInternalError";
  H265TranscodeResult[H265TranscodeResult["H265TranscodeResultServiceUnavailable"] = 10] = "H265TranscodeResultServiceUnavailable";
  return H265TranscodeResult;
}({});

/* class_IH265TranscoderObserver */

/* class_IH265Transcoder */
export class IH265Transcoder {}
//# sourceMappingURL=IAgoraH265Transcoder.js.map