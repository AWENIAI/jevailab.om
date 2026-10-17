import { VIDEO_MODELS } from './contracts';

export function getVideoCreatorCapabilitySnapshot() {
  return {
    models: [
      {
        id: VIDEO_MODELS[0],
        label: 'Seedance 2.0 Mini',
        supportsDuration: true,
      },
      {
        id: VIDEO_MODELS[1],
        label: 'Wan Animate',
        supportsDuration: false,
      },
    ],
    resolutions: ['480p', '720p'] as const,
    referenceImage: {
      maxBytes: 8 * 1024 * 1024,
      mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  };
}
