import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
export interface Spec extends TurboModule {
    newIrisApiEngine(): boolean;
    destroyIrisApiEngine(): boolean;
    callApi(args: {
        funcName: string;
        params: string;
        buffers?: string[];
    }): string;
    showRPSystemBroadcastPickerView(showsMicrophoneButton: boolean): Promise<void>;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeAgoraRtcNg.d.ts.map