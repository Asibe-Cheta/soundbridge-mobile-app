import React, { Component } from 'react';
import { HostComponent } from 'react-native';
import { RtcRendererViewProps } from '../AgoraRtcRenderView';
import { IrisApiParam } from './IrisApiEngine';
export default abstract class IAgoraRtcRenderView<T extends RtcRendererViewProps> extends Component<T> {
    abstract get view(): HostComponent<any>;
    get funcName(): string;
    params(props: RtcRendererViewProps): IrisApiParam;
    render(): React.JSX.Element;
}
//# sourceMappingURL=IAgoraRtcRenderView.d.ts.map