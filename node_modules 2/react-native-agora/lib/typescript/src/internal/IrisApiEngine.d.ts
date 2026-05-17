import EventEmitter from 'eventemitter3';
import { IAudioEncodedFrameObserver } from '../AgoraBase';
import { IAudioFrameObserver, IAudioPcmFrameSink, IAudioSpectrumObserver, IFaceInfoObserver, IMediaRecorderObserver, IVideoEncodedFrameObserver, IVideoFrameObserver } from '../AgoraMediaBase';
import { IH265TranscoderObserver } from '../IAgoraH265Transcoder';
import { IMediaPlayerVideoFrameObserver } from '../IAgoraMediaPlayer';
import { IMediaPlayerSourceObserver } from '../IAgoraMediaPlayerSource';
import { IMusicContentCenterEventHandler } from '../IAgoraMusicContentCenter';
import { IDirectCdnStreamingEventHandler, IMetadataObserver, IRtcEngineEventHandler } from '../IAgoraRtcEngine';
export type IrisApiParam = {
    funcName: string;
    params: string;
    buffers?: string[];
};
export declare const DeviceEventEmitter: EventEmitter;
/**
 * @internal
 */
export declare function setDebuggable(flag: boolean): void;
/**
 * @internal
 */
export declare function isDebuggable(): boolean;
/**
 * @internal
 */
export type EventProcessor<T extends ProcessorType> = {
    suffix: string;
    type: (data: any) => EVENT_TYPE;
    func: Function[];
    preprocess?: (event: string, data: any, buffers: Uint8Array[]) => void;
    handlers: (data: any) => (T | undefined)[] | undefined;
};
export declare enum EVENT_TYPE {
    IMediaEngine = 0,
    IMediaPlayer = 1,
    IMediaRecorder = 2,
    IRtcEngine = 3,
    IMusicContentCenter = 4,
    IAgoraH265Transcoder = 5
}
type ProcessorType = IAudioFrameObserver | IVideoFrameObserver | IAudioSpectrumObserver | IAudioEncodedFrameObserver | IVideoEncodedFrameObserver | IMediaPlayerSourceObserver | IAudioPcmFrameSink | IMediaPlayerVideoFrameObserver | IMediaRecorderObserver | IMetadataObserver | IDirectCdnStreamingEventHandler | IRtcEngineEventHandler | IMusicContentCenterEventHandler | IH265TranscoderObserver | IFaceInfoObserver;
type EventProcessors = {
    IAudioFrameObserver: EventProcessor<IAudioFrameObserver>;
    IVideoFrameObserver: EventProcessor<IVideoFrameObserver>;
    IAudioSpectrumObserver: EventProcessor<IAudioSpectrumObserver>;
    IAudioEncodedFrameObserver: EventProcessor<IAudioEncodedFrameObserver>;
    IVideoEncodedFrameObserver: EventProcessor<IVideoEncodedFrameObserver>;
    IMediaPlayerSourceObserver: EventProcessor<IMediaPlayerSourceObserver>;
    IAudioPcmFrameSink: EventProcessor<IAudioPcmFrameSink>;
    IMediaPlayerVideoFrameObserver: EventProcessor<IMediaPlayerVideoFrameObserver>;
    IMediaRecorderObserver: EventProcessor<IMediaRecorderObserver>;
    IMetadataObserver: EventProcessor<IMetadataObserver>;
    IDirectCdnStreamingEventHandler: EventProcessor<IDirectCdnStreamingEventHandler>;
    IRtcEngineEventHandler: EventProcessor<IRtcEngineEventHandler>;
    IMusicContentCenterEventHandler: EventProcessor<IMusicContentCenterEventHandler>;
    IH265TranscoderObserver: EventProcessor<IH265TranscoderObserver>;
    IFaceInfoObserver: EventProcessor<IFaceInfoObserver>;
};
/**
 * @internal
 */
export declare const EVENT_PROCESSORS: EventProcessors;
/**
 * @internal
 */
export declare function callIrisApi(funcName: string, params: any): any;
/**
 * @internal
 */
export declare function emitEvent<EventType extends keyof T, T extends ProcessorType>(eventType: EventType, eventProcessor: EventProcessor<T>, data: any): void;
export {};
//# sourceMappingURL=IrisApiEngine.d.ts.map