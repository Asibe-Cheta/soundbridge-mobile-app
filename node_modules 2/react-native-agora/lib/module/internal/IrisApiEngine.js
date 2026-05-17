import { Buffer } from 'buffer';
import base64 from 'base64-js';
import EventEmitter from 'eventemitter3';
import JSONBigInt from 'json-bigint';
const JSON = JSONBigInt({
  storeAsString: true
});
import { NativeEventEmitter } from 'react-native';
import { processIAudioEncodedFrameObserver } from '../impl/AgoraBaseImpl';
import { processIAudioFrameObserver, processIAudioFrameObserverBase, processIAudioPcmFrameSink, processIAudioSpectrumObserver, processIFaceInfoObserver, processIMediaRecorderObserver, processIVideoEncodedFrameObserver, processIVideoFrameObserver } from '../impl/AgoraMediaBaseImpl';
import { processIH265TranscoderObserver } from '../impl/IAgoraH265TranscoderImpl';
import { processIMediaPlayerVideoFrameObserver } from '../impl/IAgoraMediaPlayerImpl';
import { processIMediaPlayerSourceObserver } from '../impl/IAgoraMediaPlayerSourceImpl';
import { processIMusicContentCenterEventHandler } from '../impl/IAgoraMusicContentCenterImpl';
import { processIDirectCdnStreamingEventHandler, processIMetadataObserver, processIRtcEngineEventHandler } from '../impl/IAgoraRtcEngineImpl';
import AgoraRtcNg from '../specs';
import { H265TranscoderInternal } from './AgoraH265TranscoderInternal';
import { VideoFrameMetaInfoInternal } from './AgoraMediaBaseInternal';
import { MediaEngineInternal } from './MediaEngineInternal';
import { MediaPlayerInternal } from './MediaPlayerInternal';
import { MediaRecorderInternal } from './MediaRecorderInternal';
import { MusicCollectionInternal, MusicContentCenterInternal } from './MusicContentCenterInternal';
import { RtcEngineExInternal } from './RtcEngineExInternal';
// @ts-ignore
export const DeviceEventEmitter = new EventEmitter();
const AgoraEventEmitter = new NativeEventEmitter(AgoraRtcNg);
AgoraEventEmitter.addListener('AgoraRtcNg:onEvent', handleEvent);
let debuggable = false;

/**
 * @internal
 */
export function setDebuggable(flag) {
  debuggable = flag;
}

/**
 * @internal
 */
export function isDebuggable() {
  return debuggable && __DEV__;
}

/**
 * @internal
 */

export let EVENT_TYPE = /*#__PURE__*/function (EVENT_TYPE) {
  EVENT_TYPE[EVENT_TYPE["IMediaEngine"] = 0] = "IMediaEngine";
  EVENT_TYPE[EVENT_TYPE["IMediaPlayer"] = 1] = "IMediaPlayer";
  EVENT_TYPE[EVENT_TYPE["IMediaRecorder"] = 2] = "IMediaRecorder";
  EVENT_TYPE[EVENT_TYPE["IRtcEngine"] = 3] = "IRtcEngine";
  EVENT_TYPE[EVENT_TYPE["IMusicContentCenter"] = 4] = "IMusicContentCenter";
  EVENT_TYPE[EVENT_TYPE["IAgoraH265Transcoder"] = 5] = "IAgoraH265Transcoder";
  return EVENT_TYPE;
}({});
/**
 * @internal
 */
export const EVENT_PROCESSORS = {
  IAudioFrameObserver: {
    suffix: 'AudioFrameObserver_',
    type: () => EVENT_TYPE.IMediaEngine,
    func: [processIAudioFrameObserver, processIAudioFrameObserverBase],
    preprocess: (event, data, buffers) => {
      if (data.audioFrame) {
        data.audioFrame.buffer = buffers[0];
      }
    },
    handlers: () => MediaEngineInternal._audio_frame_observers
  },
  IVideoFrameObserver: {
    suffix: 'VideoFrameObserver_',
    type: () => EVENT_TYPE.IMediaEngine,
    func: [processIVideoFrameObserver],
    preprocess: (event, data, buffers) => {
      if (data.videoFrame) {
        data.videoFrame.yBuffer = buffers[0];
        data.videoFrame.uBuffer = buffers[1];
        data.videoFrame.vBuffer = buffers[2];
        data.videoFrame.metadata_buffer = buffers[3];
        data.videoFrame.alphaBuffer = buffers[4];
        let metaInfo = data.videoFrame.metaInfo;
        data.videoFrame.metaInfo = new VideoFrameMetaInfoInternal(metaInfo);
      }
    },
    handlers: () => MediaEngineInternal._video_frame_observers
  },
  IAudioSpectrumObserver: {
    suffix: 'AudioSpectrumObserver_',
    type: data => data.playerId === 0 ? EVENT_TYPE.IRtcEngine : EVENT_TYPE.IMediaPlayer,
    func: [processIAudioSpectrumObserver],
    handlers: data => data.playerId === 0 ? RtcEngineExInternal._audio_spectrum_observers : MediaPlayerInternal._audio_spectrum_observers.get(data.playerId)
  },
  IAudioEncodedFrameObserver: {
    suffix: 'AudioEncodedFrameObserver_',
    type: () => EVENT_TYPE.IRtcEngine,
    func: [processIAudioEncodedFrameObserver],
    preprocess: (event, data, buffers) => {
      switch (event) {
        case 'OnRecordAudioEncodedFrame':
        case 'OnPlaybackAudioEncodedFrame':
        case 'OnMixedAudioEncodedFrame':
          data.frameBuffer = buffers[0];
          break;
      }
    },
    handlers: () => RtcEngineExInternal._audio_encoded_frame_observers
  },
  IVideoEncodedFrameObserver: {
    suffix: 'VideoEncodedFrameObserver_',
    type: () => EVENT_TYPE.IMediaEngine,
    func: [processIVideoEncodedFrameObserver],
    preprocess: (event, data, buffers) => {
      switch (event) {
        case 'onEncodedVideoFrameReceived':
          data.imageBuffer = buffers[0];
          break;
      }
    },
    handlers: () => MediaEngineInternal._video_encoded_frame_observers
  },
  IMediaPlayerSourceObserver: {
    suffix: 'MediaPlayerSourceObserver_',
    type: () => EVENT_TYPE.IMediaPlayer,
    func: [processIMediaPlayerSourceObserver],
    handlers: data => MediaPlayerInternal._source_observers.get(data.playerId)
  },
  IAudioPcmFrameSink: {
    suffix: 'AudioPcmFrameSink_',
    type: () => EVENT_TYPE.IMediaPlayer,
    func: [processIAudioPcmFrameSink],
    preprocess: (event, data, buffers) => {
      if (data.frame) {
        data.frame.data_ = Array.from(buffers[0] ?? []);
      }
    },
    handlers: data => MediaPlayerInternal._audio_frame_observers.get(data.playerId)
  },
  IMediaPlayerVideoFrameObserver: {
    suffix: 'MediaPlayerVideoFrameObserver_',
    type: () => EVENT_TYPE.IMediaPlayer,
    func: [processIMediaPlayerVideoFrameObserver],
    preprocess: (event, data, buffers) => {
      if (data.frame) {
        data.frame.yBuffer = buffers[0];
        data.frame.uBuffer = buffers[1];
        data.frame.vBuffer = buffers[2];
        data.frame.metadata_buffer = buffers[3];
        data.frame.alphaBuffer = buffers[4];
        let metaInfo = data.frame.metaInfo;
        data.frame.metaInfo = new VideoFrameMetaInfoInternal(metaInfo);
      }
    },
    handlers: data => MediaPlayerInternal._video_frame_observers.get(data.playerId)
  },
  IMediaRecorderObserver: {
    suffix: 'MediaRecorderObserver_',
    type: () => EVENT_TYPE.IMediaRecorder,
    func: [processIMediaRecorderObserver],
    handlers: data => [MediaRecorderInternal._observers.get(data.nativeHandle)]
  },
  IMetadataObserver: {
    suffix: 'MetadataObserver_',
    type: () => EVENT_TYPE.IRtcEngine,
    func: [processIMetadataObserver],
    preprocess: (event, data, buffers) => {
      switch (event) {
        case 'onMetadataReceived':
          if (data.metadata) {
            data.metadata.buffer = buffers[0];
          }
          break;
      }
    },
    handlers: () => RtcEngineExInternal._metadata_observer
  },
  IDirectCdnStreamingEventHandler: {
    suffix: 'DirectCdnStreamingEventHandler_',
    type: () => EVENT_TYPE.IRtcEngine,
    func: [processIDirectCdnStreamingEventHandler],
    handlers: () => RtcEngineExInternal._direct_cdn_streaming_event_handler
  },
  IRtcEngineEventHandler: {
    suffix: 'RtcEngineEventHandler_',
    type: () => EVENT_TYPE.IRtcEngine,
    func: [processIRtcEngineEventHandler],
    preprocess: (event, data, buffers) => {
      switch (event) {
        case 'onStreamMessage':
        case 'onStreamMessageEx':
          data.data = buffers[0];
          break;
      }
    },
    handlers: () => RtcEngineExInternal._event_handlers
  },
  IMusicContentCenterEventHandler: {
    suffix: 'MusicContentCenterEventHandler_',
    type: () => EVENT_TYPE.IMusicContentCenter,
    func: [processIMusicContentCenterEventHandler],
    preprocess: (event, data, buffers) => {
      switch (event) {
        case 'onMusicCollectionResult':
          {
            const result = data.result;
            data.result = new MusicCollectionInternal(result);
            break;
          }
      }
    },
    handlers: () => MusicContentCenterInternal._event_handlers
  },
  IH265TranscoderObserver: {
    suffix: 'H265TranscoderObserver_',
    type: () => EVENT_TYPE.IAgoraH265Transcoder,
    func: [processIH265TranscoderObserver],
    handlers: () => H265TranscoderInternal._h265_transcoder_observers
  },
  IFaceInfoObserver: {
    suffix: 'FaceInfoObserver_',
    type: () => EVENT_TYPE.IMediaEngine,
    func: [processIFaceInfoObserver],
    handlers: () => MediaEngineInternal._face_info_observers
  }
};
function handleEvent(_ref) {
  let {
    event,
    data,
    buffers
  } = _ref;
  if (debuggable) {
    console.info('onEvent', event, data, buffers);
  }
  let _data;
  try {
    _data = JSON.parse(data) ?? {};
  } catch (e) {
    _data = {};
  }
  let _event = event;
  let processor = EVENT_PROCESSORS.IRtcEngineEventHandler;
  Object.values(EVENT_PROCESSORS).some(it => {
    const p = it;
    if (_event.startsWith(p.suffix) && processor.handlers(_data) !== undefined) {
      processor = p;
      const reg = new RegExp(`^${processor.suffix}`, 'g');
      _event = _event.replace(reg, '');
      return true;
    }
    return false;
  });
  if (_event.endsWith('Ex')) {
    _event = _event.replace(/Ex$/g, '');
  }

  // for new IrisType, but this is temporary
  if (_event.includes('_')) {
    _event = _event.substring(0, _event.indexOf('_'));
  }
  const _buffers = buffers === null || buffers === void 0 ? void 0 : buffers.map(value => {
    return Buffer.from(value, 'base64');
  });
  if (processor.preprocess) {
    processor.preprocess(_event, _data, _buffers);
  }
  if (processor.handlers) {
    var _processor$handlers;
    (_processor$handlers = processor.handlers(_data)) === null || _processor$handlers === void 0 ? void 0 : _processor$handlers.map(value => {
      if (value) {
        processor.func.map(it => {
          it(value, _event, _data);
        });
      }
    });
  }
  emitEvent(_event, processor, _data);
}

/**
 * @internal
 */
export function callIrisApi(funcName, params) {
  try {
    const buffers = [];
    if (funcName.startsWith('MediaEngine_')) {
      switch (funcName) {
        case 'MediaEngine_pushAudioFrame_c71f4ab':
          // frame.buffer
          buffers.push(base64.fromByteArray(params.frame.buffer ?? Buffer.from('')));
          break;
        case 'MediaEngine_pushVideoFrame_4e544e2':
          // frame.buffer
          buffers.push(base64.fromByteArray(params.frame.buffer ?? Buffer.from('')));
          // frame.eglContext
          buffers.push(base64.fromByteArray(Buffer.from('')));
          // frame.metadata_buffer
          buffers.push(base64.fromByteArray(Buffer.from('')));
          // frame.alphaBuffer
          buffers.push(base64.fromByteArray(params.frame.alphaBuffer ?? Buffer.from('')));
          // frame.d3d11_texture_2d
          buffers.push(base64.fromByteArray(Buffer.from('')));
          break;
        case 'MediaEngine_pushEncodedVideoImage_e71452b':
          // imageBuffer
          buffers.push(base64.fromByteArray(params.imageBuffer ?? Buffer.from('')));
          break;
      }
    } else if (funcName.startsWith('MediaPlayer_') || funcName.startsWith('MusicPlayer_')) {
      var _params$toJSON;
      // @ts-ignore
      params.mediaPlayerId = this.getMediaPlayerId();
      const json = (_params$toJSON = params.toJSON) === null || _params$toJSON === void 0 ? void 0 : _params$toJSON.call();
      params.toJSON = function () {
        return {
          ...json,
          playerId: params.mediaPlayerId
        };
      };
    } else if (funcName.startsWith('MediaRecorder_')) {
      var _params$toJSON2;
      // @ts-ignore
      params.nativeHandle = this.nativeHandle;
      const json = (_params$toJSON2 = params.toJSON) === null || _params$toJSON2 === void 0 ? void 0 : _params$toJSON2.call();
      params.toJSON = function () {
        return {
          ...json,
          nativeHandle: params.nativeHandle
        };
      };
    } else if (funcName.startsWith('RtcEngine_')) {
      switch (funcName) {
        case 'RtcEngine_initialize_0320339':
          AgoraRtcNg.newIrisApiEngine();
          break;
        case 'RtcEngine_release':
          AgoraRtcNg.callApi({
            funcName,
            params: JSON.stringify(params),
            buffers
          });
          AgoraRtcNg.destroyIrisApiEngine();
          return;
        case 'RtcEngine_sendMetaData':
          // metadata.buffer
          buffers.push(base64.fromByteArray(params.metadata.buffer ?? Buffer.from('')));
          break;
        case 'RtcEngine_sendStreamMessage_8715a45':
        case 'RtcEngineEx_sendStreamMessageEx_0c34857':
          // data
          buffers.push(base64.fromByteArray(params.data ?? Buffer.from('')));
          break;
        case 'RtcEngine_destroyMediaPlayer_328a49b':
          params.mediaPlayerId = params.media_player.getMediaPlayerId();
          params.toJSON = function () {
            return {
              playerId: params.mediaPlayerId
            };
          };
          break;
        case 'RtcEngine_destroyMediaRecorder_95cdef5':
          // @ts-ignore
          params.nativeHandle = params.mediaRecorder.nativeHandle;
          params.toJSON = function () {
            return {
              nativeHandle: params.nativeHandle
            };
          };
          break;
      }
    }
    let ret = AgoraRtcNg.callApi({
      funcName,
      params: JSON.stringify(params),
      buffers
    });
    if (ret !== undefined && ret !== null && ret !== '' && ret !== 'null') {
      const retObj = JSON.parse(ret);
      if (isDebuggable()) {
        if (typeof retObj.result === 'number' && retObj.result < 0) {
          console.error('callApi', funcName, JSON.stringify(params), ret);
        } else {
          console.log('callApi', funcName, JSON.stringify(params), ret);
        }
      }
      return retObj;
    }
  } catch (e) {
    if (isDebuggable()) {
      console.error('callApi', funcName, JSON.stringify(params), e);
    } else {
      console.warn('callApi', funcName, JSON.stringify(params), e);
    }
  }
  return {};
}

/**
 * @internal
 */
export function emitEvent(eventType, eventProcessor, data) {
  DeviceEventEmitter.emit(eventType, eventProcessor, data);
}
//# sourceMappingURL=IrisApiEngine.js.map