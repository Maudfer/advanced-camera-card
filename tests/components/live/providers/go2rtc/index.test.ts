import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('../../../../../src/components/live/providers/go2rtc/video-rtc.js', () => ({
  VideoRTC: class extends HTMLElement {
    public mediaPlayerController = null;
    public microphoneStream = null;
    public video = null;
    public src = '';
    public mode = '';
    public visibilityCheck = false;

    public reset = vi.fn();
    public reconnect = vi.fn();
    public setControls = vi.fn();
  },
}));

import '../../../../../src/components/live/providers/go2rtc/index';
import { Camera } from '../../../../../src/camera-manager/camera';
import { AdvancedCameraCardGo2RTC } from '../../../../../src/components/live/providers/go2rtc/index';
import { createCameraConfig, createHASS } from '../../../../test-utils';

// @vitest-environment jsdom
describe('AdvancedCameraCardGo2RTC', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should not render a no-endpoint error while endpoints are still loading', async () => {
    const camera = mock<Camera>();
    vi.mocked(camera.getConfig).mockReturnValue(
      createCameraConfig({
        live_provider: 'go2rtc',
      }),
    );

    const element = document.createElement(
      'advanced-camera-card-live-go2rtc',
    ) as AdvancedCameraCardGo2RTC;
    element.hass = createHASS();
    element.camera = camera;

    document.body.appendChild(element);
    await element.updateComplete;

    expect(
      element.shadowRoot?.querySelector('advanced-camera-card-message'),
    ).toBeNull();
  });

  it('should render a no-endpoint error when endpoints are explicitly missing', async () => {
    const camera = mock<Camera>();
    vi.mocked(camera.getConfig).mockReturnValue(
      createCameraConfig({
        live_provider: 'go2rtc',
      }),
    );

    const element = document.createElement(
      'advanced-camera-card-live-go2rtc',
    ) as AdvancedCameraCardGo2RTC;
    element.hass = createHASS();
    element.camera = camera;
    element.cameraEndpoints = {};

    document.body.appendChild(element);
    await element.updateComplete;

    expect(
      element.shadowRoot?.querySelector('advanced-camera-card-message'),
    ).not.toBeNull();
  });

  it('should create a player for direct go2rtc endpoints and recreate it on endpoint changes', async () => {
    const camera = mock<Camera>();
    vi.mocked(camera.getConfig).mockReturnValue(
      createCameraConfig({
        live_provider: 'go2rtc',
        go2rtc: {
          modes: ['webrtc'],
        },
      }),
    );
    vi.mocked(camera.getLiveProxyConfig).mockReturnValue({
      enabled: false,
      enforce: false,
      dynamic: true,
      ssl_verification: true,
      ssl_ciphers: 'default',
    });

    const createPlayerSpy = vi
      .spyOn(AdvancedCameraCardGo2RTC.prototype as never, '_createPlayer' as never)
      .mockImplementation(function (this: AdvancedCameraCardGo2RTC) {
        (this as unknown as { _player: object })._player = {};
      });

    const element = document.createElement(
      'advanced-camera-card-live-go2rtc',
    ) as AdvancedCameraCardGo2RTC;
    element.hass = createHASS();
    element.camera = camera;
    element.cameraEndpoints = {
      go2rtc: {
        endpoint: 'ws://example.com/api/ws?src=main',
        sign: false,
      },
    };

    document.body.appendChild(element);
    await element.updateComplete;

    expect(createPlayerSpy).toHaveBeenCalledTimes(1);

    element.cameraEndpoints = {
      go2rtc: {
        endpoint: 'ws://example.com/api/ws?src=doorbell',
        sign: false,
      },
    };
    await element.updateComplete;

    expect(createPlayerSpy).toHaveBeenCalledTimes(2);
  });
});
