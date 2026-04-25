import { MenuConfig } from '../config/schema/menu';

export const shouldAutoHideMenu = (
  menuConfig: MenuConfig | null | undefined,
  options?: {
    callActive?: boolean;
    casted?: boolean;
  },
): boolean => {
  if (!menuConfig?.auto_hide?.length) {
    return false;
  }

  return (
    (!!options?.callActive && menuConfig.auto_hide.includes('call')) ||
    (!!options?.casted && menuConfig.auto_hide.includes('casting'))
  );
};
