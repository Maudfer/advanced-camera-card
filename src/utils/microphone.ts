import type { MicrophoneState } from '../card-controller/types';
import type { AdvancedCameraCardConfig } from '../config/schema/types';

export const isMicrophoneActive = (
  microphoneState?: MicrophoneState | null,
): boolean => {
  return !!microphoneState?.connected && !microphoneState.muted;
};

export const shouldLockNavigation = (
  config?: AdvancedCameraCardConfig | null,
  microphoneState?: MicrophoneState | null,
): boolean => {
  return (
    (config?.live.microphone.lock_navigation ?? true) &&
    isMicrophoneActive(microphoneState)
  );
};
