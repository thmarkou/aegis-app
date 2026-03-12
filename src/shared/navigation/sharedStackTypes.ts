/**
 * Shared param types for screens used in both MissionStack and InventoryStack.
 */
export type SharedStackParamList = {
  KitList: undefined;
  KitDetail: { kitId: string };
  KitForm: { kitId: string };
  ItemForm: { kitId: string; itemId?: string };
  Profiles: undefined;
  ProfileForm: { profileId?: string };
};
