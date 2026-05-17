"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _AgoraMediaBase = require("../AgoraMediaBase");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
class IAgoraRtcRenderView extends _react.Component {
  get funcName() {
    let funcName;
    const {
      canvas,
      connection
    } = this.props;
    if (canvas.sourceType === undefined) {
      if (canvas.uid) {
        funcName = 'RtcEngine_setupRemoteVideo_acc9c38';
      } else {
        funcName = 'RtcEngine_setupLocalVideo_acc9c38';
      }
    } else if (canvas.sourceType === _AgoraMediaBase.VideoSourceType.VideoSourceRemote) {
      funcName = 'RtcEngine_setupRemoteVideo_acc9c38';
    } else {
      funcName = 'RtcEngine_setupLocalVideo_acc9c38';
    }
    if (funcName === 'RtcEngine_setupRemoteVideo_acc9c38' && connection) {
      funcName = 'RtcEngineEx_setupRemoteVideoEx_522a409';
    }
    return funcName;
  }
  params(props) {
    const {
      canvas,
      connection
    } = props;
    let {
      mediaPlayerId
    } = canvas;
    if (canvas.sourceType === _AgoraMediaBase.VideoSourceType.VideoSourceMediaPlayer && canvas.mediaPlayerId === undefined) {
      mediaPlayerId = canvas.uid;
    }
    return {
      funcName: this.funcName,
      params: JSON.stringify({
        canvas: {
          ...canvas,
          mediaPlayerId
        },
        connection
      })
    };
  }
  render() {
    const {
      canvas,
      connection,
      ...others
    } = this.props;
    const AgoraRtcRenderer = this.view;
    return /*#__PURE__*/_react.default.createElement(AgoraRtcRenderer, _extends({
      style: styles.renderer,
      callApi: this.params({
        canvas,
        connection
      })
    }, others));
  }
}
exports.default = IAgoraRtcRenderView;
const styles = _reactNative.StyleSheet.create({
  renderer: {
    flex: 1
  }
});
//# sourceMappingURL=IAgoraRtcRenderView.js.map