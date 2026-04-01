/**
 * Shared param types for screens used in both MissionStack and InventoryStack.
 */
export type SharedStackParamList = {
  KitList: undefined;
  KitDetail: { kitId: string; highlightedPackItemId?: string };
  KitForm: { kitId: string };
  ItemForm: { kitId?: string; poolItemId?: string; packItemId?: string };
  PoolPicker: { kitId: string };
  InventoryPool: undefined;
  Profiles: undefined;
  ProfileForm: { profileId?: string };
};
