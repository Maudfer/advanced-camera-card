import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { CallManager } from '../../src/card-controller/call-manager';
import { MediaPlayerController } from '../../src/types';
import {
  createConfig,
  createCapabilities,
  createCameraConfig,
  createCardAPI,
  createMediaLoadedInfo,
  createStore,
  createView,
} from '../test-utils';

const createCallStore = (options?: {
  config?: Record<string, unknown>;
  capabilities?: ReturnType<typeof createCapabilities> | null;
}) =>
  createStore([
    {
      cameraID: 'camera-1',
      capabilities:
        options?.capabilities === undefined
          ? createCapabilities({
              '2-way-audio': true,
            })
          : options.capabilities,
      config: createCameraConfig({
        live_provider: 'go2rtc',
        call: {
          stream: 'doorbell',
        },
        ...options?.config,
      }),
    },
  ]);

// @vitest-environment jsdom
describe('CallManager', () => {
  it('should expose lock state and prepare major view changes from the active call', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    const microphoneState = {
      connected: false,
      muted: true,
      forbidden: false,
    };
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getMicrophoneManager().getState).mockImplementation(
      () => microphoneState,
    );
    vi.mocked(api.getMicrophoneManager().unmute).mockImplementation(async () => {
      microphoneState.connected = true;
      microphoneState.muted = false;
    });
    vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
      createConfig({
        live: {
          microphone: {
            lock_navigation: true,
          },
        },
      }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(
      createStore([
        {
          cameraID: 'camera-1',
          capabilities: createCapabilities({
            '2-way-audio': true,
          }),
          config: createCameraConfig({
            live_provider: 'go2rtc',
            call: {
              stream: 'doorbell',
            },
          }),
        },
      ]),
    );
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    const nextView = createView({
      camera: 'camera-2',
      view: 'live',
      context: {
        call: {
          camera: 'camera-1',
          state: 'in_call',
          stream: 'doorbell',
        },
      },
    });

    expect(manager.isNavigationLocked()).toBe(false);
    expect(
      manager.prepareViewChange(nextView.clone(), {
        majorMediaChange: true,
      }),
    ).toBe(false);

    await manager.startCall();

    expect(manager.isNavigationLocked()).toBe(false);

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    expect(manager.isNavigationLocked()).toBe(true);
    expect(
      manager.prepareViewChange(nextView, {
        majorMediaChange: true,
      }),
    ).toBe(true);
    expect(nextView.context?.call).toBeUndefined();
  });

  it('should not lock navigation when live microphone lock_navigation is disabled', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    const microphoneState = {
      connected: false,
      muted: true,
      forbidden: false,
    };
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getMicrophoneManager().getState).mockImplementation(
      () => microphoneState,
    );
    vi.mocked(api.getMicrophoneManager().unmute).mockImplementation(async () => {
      microphoneState.connected = true;
      microphoneState.muted = false;
    });
    vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
      createConfig({
        live: {
          microphone: {
            lock_navigation: false,
          },
        },
      }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    const nextView = createView({
      camera: 'camera-2',
      view: 'live',
      context: {
        call: {
          camera: 'camera-1',
          state: 'in_call',
          stream: 'doorbell',
        },
      },
    });

    expect(
      manager.prepareViewChange(nextView, {
        majorMediaChange: true,
      }),
    ).toBe(true);
    expect(nextView.context?.call).toBeUndefined();
    expect(manager.isNavigationLocked()).toBe(false);
  });

  it('should start a call and transition into an active session', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(true);

    expect(mediaPlayerController.mute).toBeCalled();
    expect(api.getViewManager().setViewByParameters).toBeCalledWith(
      expect.objectContaining({
        ignoreNavigationLock: true,
        modifiers: expect.any(Array),
      }),
    );
    expect(manager.getState()).toMatchObject({
      state: 'connecting_call',
      camera: 'camera-1',
      stream: 'doorbell',
    });

    await manager.onMediaLoaded(createMediaLoadedInfo({ mediaPlayerController }));

    expect(mediaPlayerController.unmute).toBeCalled();
    expect(api.getMicrophoneManager().unmute).toBeCalled();
    expect(manager.getState().state).toBe('in_call');

    await expect(manager.endCall()).resolves.toBe(true);

    expect(api.getMicrophoneManager().mute).toBeCalled();
    expect(api.getMicrophoneManager().disconnect).toBeCalled();
    expect(manager.getState().state).toBe('ending_call');

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    expect(manager.getState().state).toBe('idle');
  });

  it('should reject calls outside the live view', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'clips' }),
    );

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        type: 'error',
        icon: 'mdi:phone-off',
      }),
    );
    expect(manager.getState().state).toBe('idle');
  });

  it('should reject calls when no active view is selected', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(null);

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        message: 'Call can only be started from the live view',
      }),
    );
  });

  it('should return null for the active camera config when there is no current view', () => {
    class TestCallManager extends CallManager {
      public getActiveCameraConfigForTest() {
        return this._getActiveCameraConfig();
      }
    }

    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(null);

    const manager = new TestCallManager(api);

    expect(manager.getActiveCameraConfigForTest()).toBeNull();
  });

  it('should reject cameras without 2-way audio capability', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(
      createCallStore({
        capabilities: createCapabilities({
          '2-way-audio': false,
        }),
      }),
    );

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalled();
    expect(api.getMicrophoneManager().disconnect).toBeCalled();
    expect(manager.isActive()).toBe(false);
  });

  it('should reject calls when a session is already active', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());

    const manager = new CallManager(api);

    await expect(manager.startCall()).resolves.toBe(true);
    await expect(manager.startCall()).resolves.toBe(false);
  });

  it('should reject calls without an active camera config', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createStore([]));

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        message: 'Call can only be started from the live view',
      }),
    );
  });

  it('should reject when a call stream is not configured', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(
      createCallStore({
        config: {
          call: {},
        },
      }),
    );

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        message: 'A dedicated call stream must be configured before starting a call',
      }),
    );
  });

  it('should reject when a substream override is active', async () => {
    const api = createCardAPI();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({
        camera: 'camera-1',
        view: 'live',
        context: {
          live: {
            overrides: new Map([['camera-1', 'camera-2']]),
          },
        },
      }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());

    const manager = new CallManager(api);
    await expect(manager.startCall()).resolves.toBe(false);

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        message: 'Call cannot be started while a substream override is active',
      }),
    );
  });

  it('should ignore media events for other cameras while connecting', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-2',
    );

    expect(manager.getState().state).toBe('connecting_call');
    expect(mediaPlayerController.unmute).not.toBeCalled();

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    expect(manager.getState().state).toBe('in_call');
  });

  it('should ignore additional media loaded events once the call is active', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    mediaPlayerController.unmute.mockClear();
    vi.mocked(api.getMicrophoneManager().unmute).mockClear();

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    expect(manager.getState().state).toBe('in_call');
    expect(mediaPlayerController.unmute).not.toBeCalled();
    expect(api.getMicrophoneManager().unmute).not.toBeCalled();
  });

  it('should return false when ending an inactive call', async () => {
    const manager = new CallManager(createCardAPI());

    await expect(manager.endCall()).resolves.toBe(false);
  });

  it('should not auto-unmute the microphone when live microphone auto_unmute excludes call', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
      createConfig({
        live: {
          microphone: {
            auto_unmute: [],
          },
        },
      }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    expect(api.getMicrophoneManager().unmute).not.toBeCalled();
    expect(manager.isNavigationLocked()).toBe(false);
  });

  it('should end immediately without view changes when requested', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();

    vi.mocked(api.getViewManager().setViewByParameters).mockClear();

    await expect(manager.endCall({ modifyViewContext: false })).resolves.toBe(true);

    expect(api.getViewManager().setViewByParameters).not.toBeCalled();
    expect(manager.getState().state).toBe('idle');
  });

  it('should not auto-mute the microphone when live microphone auto_mute excludes call', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getConfigManager().getConfig).mockReturnValue(
      createConfig({
        live: {
          microphone: {
            auto_mute: [],
          },
        },
      }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.endCall();

    expect(api.getMicrophoneManager().mute).not.toBeCalled();
    expect(api.getMicrophoneManager().disconnect).toBeCalled();
  });

  it('should require camera-specific media info when ending a call', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(
      createStore([
        {
          cameraID: 'camera-1',
          config: createCameraConfig({
            live_provider: 'go2rtc',
            call: {
              stream: 'doorbell',
            },
          }),
        },
      ]),
    );
    vi.mocked(api.getMediaLoadedInfoManager().get).mockImplementation((cameraID) => {
      if (cameraID) {
        return null;
      }
      return createMediaLoadedInfo({ mediaPlayerController });
    });

    const manager = new CallManager(api);
    await manager.startCall();

    mediaPlayerController.mute.mockClear();
    await manager.endCall({ modifyViewContext: false });

    expect(mediaPlayerController.mute).not.toBeCalled();
  });

  it('should roll back a failed call setup on live errors', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(
      createStore([
        {
          cameraID: 'camera-1',
          config: createCameraConfig({
            live_provider: 'go2rtc',
            call: {
              stream: 'doorbell',
            },
          }),
        },
      ]),
    );
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onLiveError('camera-1');

    expect(api.getMessageManager().setMessageIfHigherPriority).toBeCalledWith(
      expect.objectContaining({
        type: 'error',
        icon: 'mdi:phone-off',
      }),
    );
    expect(api.getMicrophoneManager().disconnect).toBeCalled();
    expect(manager.getState().state).toBe('idle');
  });

  it('should ignore live errors when the call is inactive or for another camera', async () => {
    const api = createCardAPI();
    const manager = new CallManager(api);

    await manager.onLiveError('camera-1');
    expect(api.getMessageManager().setMessageIfHigherPriority).not.toBeCalled();

    const activeAPI = createCardAPI();
    vi.mocked(activeAPI.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(activeAPI.getCameraManager().getStore).mockReturnValue(createCallStore());

    const activeManager = new CallManager(activeAPI);
    await activeManager.startCall();

    vi.mocked(activeAPI.getMessageManager().setMessageIfHigherPriority).mockClear();
    await activeManager.onLiveError('camera-2');

    expect(activeAPI.getMessageManager().setMessageIfHigherPriority).not.toBeCalled();
    expect(activeManager.getState().state).toBe('connecting_call');
  });

  it('should remain ending_call until the normal stream reloads', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );

    await manager.endCall();

    expect(manager.getState().state).toBe('ending_call');

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-2',
    );
    expect(manager.getState().state).toBe('ending_call');

    await manager.onMediaLoaded(
      createMediaLoadedInfo({ mediaPlayerController }),
      'camera-1',
    );
    expect(manager.getState().state).toBe('idle');
  });

  it('should reset immediately on live errors while ending the call', async () => {
    const api = createCardAPI();
    const mediaPlayerController = mock<MediaPlayerController>();
    vi.mocked(api.getViewManager().getView).mockReturnValue(
      createView({ camera: 'camera-1', view: 'live' }),
    );
    vi.mocked(api.getCameraManager().getStore).mockReturnValue(createCallStore());
    vi.mocked(api.getMediaLoadedInfoManager().get).mockReturnValue(
      createMediaLoadedInfo({ mediaPlayerController }),
    );

    const manager = new CallManager(api);
    await manager.startCall();
    await manager.endCall();

    vi.mocked(api.getMessageManager().setMessageIfHigherPriority).mockClear();
    await manager.onLiveError('camera-1');

    expect(manager.getState().state).toBe('idle');
    expect(api.getMessageManager().setMessageIfHigherPriority).not.toBeCalled();
  });
});
