function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import { VideoSourceType } from '../AgoraMediaBase';
export default class IAgoraRtcRenderView extends Component {
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
    } else if (canvas.sourceType === VideoSourceType.VideoSourceRemote) {
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
    if (canvas.sourceType === VideoSourceType.VideoSourceMediaPlayer && canvas.mediaPlayerId === undefined) {
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
    return /*#__PURE__*/React.createElement(AgoraRtcRenderer, _extends({
      style: styles.renderer,
      callApi: this.params({
        canvas,
        connection
      })
    }, others));
  }
}
const styles = StyleSheet.create({
  renderer: {
    flex: 1
  }
});
//# sourceMappingURL=IAgoraRtcRenderView.js.map