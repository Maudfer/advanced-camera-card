import { expect, it } from 'vitest';
import { MicrophoneConnectAction } from '../../../../src/card-controller/actions/actions/microphone-connect';
import { createCardAPI } from '../../../test-utils';

it('should handle microphone_connect action', async () => {
  const api = createCardAPI();
  const action = new MicrophoneConnectAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_connect',
    },
  );
  api.getCallManager().isActive.mockReturnValue(true);

  await action.execute(api);

  expect(api.getMicrophoneManager().connect).toBeCalled();
});

it('should ignore microphone_connect action when no call is active', async () => {
  const api = createCardAPI();
  const action = new MicrophoneConnectAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_connect',
    },
  );
  api.getCallManager().isActive.mockReturnValue(false);

  await action.execute(api);

  expect(api.getMicrophoneManager().connect).not.toBeCalled();
});
