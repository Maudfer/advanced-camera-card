import { describe, expect, it } from 'vitest';
import { shouldLockNavigation } from '../../src/utils/microphone';
import { createConfig } from '../test-utils';

describe('shouldLockNavigation', () => {
  it('should lock navigation when the microphone is active', () => {
    expect(
      shouldLockNavigation(createConfig(), {
        connected: true,
        muted: false,
        forbidden: false,
      }),
    ).toBe(true);
  });

  it('should not lock navigation when the microphone is muted', () => {
    expect(
      shouldLockNavigation(createConfig(), {
        connected: true,
        muted: true,
        forbidden: false,
      }),
    ).toBe(false);
  });

  it('should not lock navigation when the config disables it', () => {
    expect(
      shouldLockNavigation(
        createConfig({
          live: {
            microphone: {
              lock_navigation: false,
            },
          },
        }),
        {
          connected: true,
          muted: false,
          forbidden: false,
        },
      ),
    ).toBe(false);
  });
});