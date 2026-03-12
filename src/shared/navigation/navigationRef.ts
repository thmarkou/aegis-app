/**
 * Root navigation ref – use for emergency navigation when useNavigation context may not work.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToMap(params?: { centerOnUser?: boolean }) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Map' as never, params as never);
  }
}
