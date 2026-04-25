import { expect, it } from 'vitest';
import { createCardAPI } from '../../../test-utils';
import { MicrophoneUnmuteAction } from '../../../../src/card-controller/actions/actions/microphone-unmute';

it('should handle microphone_unmute action', async () => {
  const api = createCardAPI();
  const action = new MicrophoneUnmuteAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_unmute',
    },
  );
  api.getCallManager().isActive.mockReturnValue(true);

  await action.execute(api);

  expect(api.getMicrophoneManager().unmute).toBeCalled();
});

it('should ignore microphone_unmute action when no call is active', async () => {
  const api = createCardAPI();
  const action = new MicrophoneUnmuteAction(
    {},
    {
      action: 'fire-dom-event',
      advanced_camera_card_action: 'microphone_unmute',
    },
  );
  api.getCallManager().isActive.mockReturnValue(false);

  await action.execute(api);

  expect(api.getMicrophoneManager().unmute).not.toBeCalled();
});
