import { fireAdvancedCameraCardEvent } from '../../../utils/fire-advanced-camera-card-event';

export function dispatchLiveErrorEvent(
  element: EventTarget,
  detail?: { cameraID?: string },
): void {
  fireAdvancedCameraCardEvent(element, 'live:error', detail);
}
