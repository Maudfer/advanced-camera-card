import { expect, it, vi } from 'vitest';
import { MicrophoneDisconnectAction } from '../../../../src/card-controller/actions/actions/microphone-disconnect';
import { createCardAPI } from '../../../test-utils';

it('should handle microphone_disconnect action during a call', async () => {
  const api = createCardAPI();
  vi.mocked(api.getCallManager().isActive).mockReturnValue(true);

  const action = new MicrophoneDisconnectAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_disconnect',
    },
  );

  await action.execute(api);

  expect(api.getMicrophoneManager().disconnect).toBeCalled();
});

it('should ignore microphone_disconnect action when there is no active call', async () => {
  const api = createCardAPI();
  vi.mocked(api.getCallManager().isActive).mockReturnValue(false);

  const action = new MicrophoneDisconnectAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_disconnect',
    },
  );

  await action.execute(api);

  expect(api.getMicrophoneManager().disconnect).not.toBeCalled();
});
