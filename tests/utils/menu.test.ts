import { describe, expect, it } from 'vitest';
import { menuConfigSchema } from '../../src/config/schema/menu';
import { shouldAutoHideMenu } from '../../src/utils/menu';

describe('shouldAutoHideMenu', () => {
  it('should hide when call is active and call auto-hide is configured', () => {
    const config = menuConfigSchema.parse({ auto_hide: ['call'] });

    expect(shouldAutoHideMenu(config, { callActive: true })).toBe(true);
    expect(shouldAutoHideMenu(config, { callActive: false })).toBe(false);
  });

  it('should hide when casting is active and casting auto-hide is configured', () => {
    const config = menuConfigSchema.parse({ auto_hide: ['casting'] });

    expect(shouldAutoHideMenu(config, { casted: true })).toBe(true);
    expect(shouldAutoHideMenu(config, { casted: false })).toBe(false);
  });

  it('should not hide when no auto-hide conditions are configured', () => {
    const config = menuConfigSchema.parse({ auto_hide: [] });

    expect(shouldAutoHideMenu(config, { callActive: true, casted: true })).toBe(
      false,
    );
  });
});
