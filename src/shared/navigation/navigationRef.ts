/**
 * Root navigation ref – use for emergency navigation when useNavigation context may not work.
 */
import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToMap(params?: { centerOnUser?: boolean }) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name: 'Map', params: params ?? {} }));
  }
}
