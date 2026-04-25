import { expect, it, vi } from 'vitest';
import { MicrophoneMuteAction } from '../../../../src/card-controller/actions/actions/microphone-mute';
import { createCardAPI } from '../../../test-utils';

it('should handle microphone_mute action during a call', async () => {
  const api = createCardAPI();
  vi.mocked(api.getCallManager().isActive).mockReturnValue(true);

  const action = new MicrophoneMuteAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_mute',
    },
  );

  await action.execute(api);

  expect(api.getMicrophoneManager().mute).toBeCalled();
});

it('should ignore microphone_mute action when there is no active call', async () => {
  const api = createCardAPI();
  vi.mocked(api.getCallManager().isActive).mockReturnValue(false);

  const action = new MicrophoneMuteAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_mute',
    },
  );

  await action.execute(api);

  expect(api.getMicrophoneManager().mute).not.toBeCalled();
});
