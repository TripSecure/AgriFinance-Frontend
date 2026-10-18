import { GpsLocation } from './orders.state';

export const getCurrentLocation = (): Promise<GpsLocation> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied. Allow it in your browser to attach GPS.'
              : 'Unable to read your current location.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
