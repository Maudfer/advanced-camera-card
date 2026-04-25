import { CameraConfig } from '../config/schema/cameras';
import { localize } from '../localize/localize';
import { MediaLoadedInfo } from '../types';
import { getResolvedLiveProvider } from '../utils/live-provider';
import { shouldLockNavigation } from '../utils/microphone';
import { hasSubstream } from '../utils/substream';
import { CallViewState } from '../utils/call';
import { MergeContextViewModifier } from './view/modifiers/merge-context';
import { RemoveContextViewModifier } from './view/modifiers/remove-context';
import { CardCallAPI } from './types';

export type CallState = 'idle' | 'connecting_call' | 'in_call' | 'ending_call' | 'error';

export interface CallSessionState {
  state: CallState;
  camera?: string;
  stream?: string;
  message?: string;
}

const CALL_IDLE_STATE: CallSessionState = {
  state: 'idle',
};

export interface CallEndOptions {
  modifyViewContext?: boolean;
}

export class CallManager {
  protected _api: CardCallAPI;
  protected _state: CallSessionState = { ...CALL_IDLE_STATE };
  protected _endOptions: Required<CallEndOptions> | null = null;

  constructor(api: CardCallAPI) {
    this._api = api;
  }

  public getState(): CallSessionState {
    return this._state;
  }

  public isActive(): boolean {
    return this._state.state !== 'idle';
  }

  public isNavigationLocked(): boolean {
    return shouldLockNavigation(
      this._api.getConfigManager().getConfig(),
      this._api.getMicrophoneManager().getState(),
    );
  }

  public shouldEndOnViewChange(): boolean {
    return this.isActive();
  }

  public reset(): void {
    this._endOptions = null;
    this._setState({ ...CALL_IDLE_STATE });
  }

  public async startCall(): Promise<boolean> {
    if (this.isActive()) {
      return false;
    }

    const view = this._api.getViewManager().getView();
    if (!view?.is('live')) {
      return await this._fail(localize('error.call_live_only'));
    }

    const cameraConfig = this._getActiveCameraConfig();
    if (!cameraConfig) {
      return await this._fail(localize('error.call_live_only'));
    }

    const callConfig = cameraConfig.call;
    if (!callConfig?.stream) {
      return await this._fail(localize('error.call_no_stream'));
    }

    if (getResolvedLiveProvider(cameraConfig) !== 'go2rtc') {
      return await this._fail(localize('error.call_provider_unsupported'));
    }

    if (hasSubstream(view)) {
      return await this._fail(localize('error.call_substream_unsupported'));
    }

    await this._getMediaLoadedInfo(view.camera)?.mediaPlayerController?.mute();

    this._setCallContext({
      camera: view.camera,
      stream: callConfig.stream,
      state: 'connecting_call',
    });
    this._setState({
      state: 'connecting_call',
      camera: view.camera,
      stream: callConfig.stream,
    });

    return true;
  }

  public async endCall(options?: CallEndOptions): Promise<boolean> {
    if (!this.isActive()) {
      return false;
    }

    const modifyViewContext = options?.modifyViewContext ?? true;

    this._endOptions = {
      modifyViewContext,
    };

    this._setState({
      ...this._state,
      state: 'ending_call',
    });
    if (modifyViewContext) {
      this._setCallContext({ state: 'ending_call' });
    }

    if (this._shouldAutoMuteMicrophone()) {
      this._api.getMicrophoneManager().mute();
    }
    this._api.getMicrophoneManager().disconnect();
    await this._getMediaLoadedInfo(this._state.camera)?.mediaPlayerController?.mute();

    if (!modifyViewContext) {
      this.reset();
      return true;
    }

    this._clearCallContext();
    return true;
  }

  public async onMediaLoaded(
    mediaLoadedInfo: MediaLoadedInfo,
    cameraID?: string | null,
  ): Promise<void> {
    if (!this._matchesActiveCamera(cameraID)) {
      return;
    }

    if (this._state.state === 'connecting_call') {
      await mediaLoadedInfo.mediaPlayerController?.unmute();
      if (this._shouldAutoUnmuteMicrophone()) {
        await this._api.getMicrophoneManager().unmute();
      }

      this._setCallContext({ state: 'in_call' });
      this._setState({
        ...this._state,
        state: 'in_call',
      });
      return;
    }

    if (this._state.state === 'ending_call' && this._endOptions?.modifyViewContext) {
      this.reset();
    }
  }

  public async onLiveError(cameraID?: string | null): Promise<void> {
    if (!this.isActive() || !this._matchesActiveCamera(cameraID)) {
      return;
    }

    if (this._state.state === 'ending_call') {
      this.reset();
      return;
    }

    await this._fail(localize('error.call_stream_failed'));
  }

  protected _getActiveCameraConfig(): CameraConfig | null {
    const view = this._api.getViewManager().getView();
    if (!view) {
      return null;
    }
    return this._api.getCameraManager().getStore().getCameraConfig(view.camera);
  }

  protected _setCallContext(context: {
    camera?: string;
    stream?: string;
    state?: CallViewState;
  }): void {
    this._api.getViewManager().setViewByParameters({
      modifiers: [new MergeContextViewModifier({ call: context })],
      ignoreNavigationLock: true,
    });
  }

  protected _clearCallContext(): void {
    this._api.getViewManager().setViewByParameters({
      modifiers: [new RemoveContextViewModifier(['call'])],
      ignoreNavigationLock: true,
    });
  }

  protected _getMediaLoadedInfo(cameraID?: string): MediaLoadedInfo | null {
    return this._api.getMediaLoadedInfoManager().get(cameraID);
  }

  protected _matchesActiveCamera(cameraID?: string | null): boolean {
    return !cameraID || !this._state.camera || cameraID === this._state.camera;
  }

  protected _shouldAutoMuteMicrophone(): boolean {
    return (
      this._api
        .getConfigManager()
        .getConfig()
        ?.live.microphone.auto_mute.includes('call') ?? true
    );
  }

  protected _shouldAutoUnmuteMicrophone(): boolean {
    return (
      this._api
        .getConfigManager()
        .getConfig()
        ?.live.microphone.auto_unmute.includes('call') ?? true
    );
  }

  protected async _fail(message: string): Promise<false> {
    this._setState({
      ...this._state,
      state: 'error',
      message,
    });
    this._api.getMessageManager().setMessageIfHigherPriority({
      type: 'error',
      icon: 'mdi:phone-off',
      message,
    });
    this._api.getMicrophoneManager().mute();
    this._api.getMicrophoneManager().disconnect();
    await this._getMediaLoadedInfo(this._state.camera)?.mediaPlayerController?.mute();
    this._clearCallContext();
    this.reset();
    return false;
  }

  protected _setState(state: CallSessionState): void {
    this._state = state;
    this._api.getConditionStateManager().setState({
      call: this._state,
    });
    this._api.getCardElementManager().update();
  }
}
