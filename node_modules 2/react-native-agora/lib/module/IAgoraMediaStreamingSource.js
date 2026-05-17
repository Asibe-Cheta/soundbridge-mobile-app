import './extension/IAgoraMediaStreamingSourceExtension';

/* enum_StreamingSrcErr */
export let StreamingSrcErr = /*#__PURE__*/function (StreamingSrcErr) {
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrNone"] = 0] = "StreamingSrcErrNone";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrUnknown"] = 1] = "StreamingSrcErrUnknown";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrInvalidParam"] = 2] = "StreamingSrcErrInvalidParam";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrBadState"] = 3] = "StreamingSrcErrBadState";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrNoMem"] = 4] = "StreamingSrcErrNoMem";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrBufferOverflow"] = 5] = "StreamingSrcErrBufferOverflow";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrBufferUnderflow"] = 6] = "StreamingSrcErrBufferUnderflow";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrNotFound"] = 7] = "StreamingSrcErrNotFound";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrTimeout"] = 8] = "StreamingSrcErrTimeout";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrExpired"] = 9] = "StreamingSrcErrExpired";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrUnsupported"] = 10] = "StreamingSrcErrUnsupported";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrNotExist"] = 11] = "StreamingSrcErrNotExist";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrExist"] = 12] = "StreamingSrcErrExist";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrOpen"] = 13] = "StreamingSrcErrOpen";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrClose"] = 14] = "StreamingSrcErrClose";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrRead"] = 15] = "StreamingSrcErrRead";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrWrite"] = 16] = "StreamingSrcErrWrite";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrSeek"] = 17] = "StreamingSrcErrSeek";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrEof"] = 18] = "StreamingSrcErrEof";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrCodecopen"] = 19] = "StreamingSrcErrCodecopen";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrCodecclose"] = 20] = "StreamingSrcErrCodecclose";
  StreamingSrcErr[StreamingSrcErr["StreamingSrcErrCodecproc"] = 21] = "StreamingSrcErrCodecproc";
  return StreamingSrcErr;
}({});

/* enum_StreamingSrcState */
export let StreamingSrcState = /*#__PURE__*/function (StreamingSrcState) {
  StreamingSrcState[StreamingSrcState["StreamingSrcStateClosed"] = 0] = "StreamingSrcStateClosed";
  StreamingSrcState[StreamingSrcState["StreamingSrcStateOpening"] = 1] = "StreamingSrcStateOpening";
  StreamingSrcState[StreamingSrcState["StreamingSrcStateIdle"] = 2] = "StreamingSrcStateIdle";
  StreamingSrcState[StreamingSrcState["StreamingSrcStatePlaying"] = 3] = "StreamingSrcStatePlaying";
  StreamingSrcState[StreamingSrcState["StreamingSrcStateSeeking"] = 4] = "StreamingSrcStateSeeking";
  StreamingSrcState[StreamingSrcState["StreamingSrcStateEof"] = 5] = "StreamingSrcStateEof";
  StreamingSrcState[StreamingSrcState["StreamingSrcStateError"] = 6] = "StreamingSrcStateError";
  return StreamingSrcState;
}({});

/* class_InputSeiData */
export class InputSeiData {}
//# sourceMappingURL=IAgoraMediaStreamingSource.js.map