import { describe, expect, it } from 'vitest';
import { getCallStream } from '../../src/utils/call';
import { createView } from '../test-utils';

describe('getCallStream', () => {
  it('should return the call stream for the active camera', () => {
    const view = createView({
      camera: 'camera-1',
      context: {
        call: {
          camera: 'camera-1',
          stream: 'doorbell',
          state: 'in_call',
        },
      },
    });

    expect(getCallStream(view)).toBe('doorbell');
  });

  it('should return the call stream for an explicitly requested camera', () => {
    const view = createView({
      camera: 'camera-1',
      context: {
        call: {
          camera: 'camera-2',
          stream: 'intercom',
          state: 'connecting_call',
        },
      },
    });

    expect(getCallStream(view, 'camera-2')).toBe('intercom');
  });

  it('should return null when the matching call context has no stream', () => {
    const view = createView({
      camera: 'camera-1',
      context: {
        call: {
          camera: 'camera-1',
          state: 'in_call',
        },
      },
    });

    expect(getCallStream(view)).toBeNull();
  });

  it('should return null when the requested camera does not match', () => {
    const view = createView({
      camera: 'camera-1',
      context: {
        call: {
          camera: 'camera-2',
          stream: 'intercom',
          state: 'connecting_call',
        },
      },
    });

    expect(getCallStream(view)).toBeNull();
    expect(getCallStream(view, 'camera-3')).toBeNull();
  });
});
