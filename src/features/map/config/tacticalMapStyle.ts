/**
 * Dark/Silver tactical map style for Google Maps customMapStyle.
 * Works on Android (Google Maps). On iOS with MapKit, customMapStyle has no effect.
 */
export const tacticalMapStyle = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }, { lightness: 13 }] },
  { featureType: 'administrative', elementType: 'geometry.fill', stylers: [{ color: '#2d2d2d' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3f3f46' }, { lightness: 14 }, { weight: 1.4 }] },
  { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#18181b' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#262626' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#3f3f46' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#52525b' }, { lightness: 25 }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#27272a' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#1f1f23' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#262626' }] },
  { featureType: 'water', elementType: 'all', stylers: [{ color: '#0c0c0e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#71717a' }] },
];
