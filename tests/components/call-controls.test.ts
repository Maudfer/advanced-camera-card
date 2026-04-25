import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/components/call-controls';
import { AdvancedCameraCardCallControls } from '../../src/components/call-controls';

// @vitest-environment jsdom
describe('CallControls', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['mute', false],
    ['unmute', true],
  ])(
    'should dispatch the %s action for the active call speaker button',
    async (expectedAction, speakerMuted) => {
    const element = document.createElement(
      'advanced-camera-card-call-controls',
    ) as AdvancedCameraCardCallControls;
    const handler = vi.fn();
    element.addEventListener('advanced-camera-card:action:execution-request', handler);
    element.callState = 'in_call';
    element.hasSpeaker = true;
    element.speakerMuted = speakerMuted;

    document.body.appendChild(element);
    await element.updateComplete;

    const buttons = element.shadowRoot?.querySelectorAll('ha-icon-button');
    expect(buttons).toHaveLength(3);

    (buttons?.[2] as HTMLElement).click();

    expect(handler).toBeCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          actions: expect.objectContaining({
            action: 'fire-dom-event',
            advanced_camera_card_action: expectedAction,
          }),
        }),
      }),
    );
    },
  );
});
