import { describe, expect, it } from 'vitest';
import { videoTemplateExamples } from '@/lib/video-creator/templates';

describe('video template catalog', () => {
  it('lists the supplied source videos in numeric order with neutral labels', () => {
    expect(videoTemplateExamples.map((template) => template.label)).toEqual([
      'Example 1',
      'Example 2',
      'Example 3',
      'Example 4',
      'Example 5',
      'Example 6',
    ]);
    expect(videoTemplateExamples.map((template) => template.videoUrl)).toEqual([
      '/videos/bulin47/1.mp4',
      '/videos/bulin47/2.mp4',
      '/videos/bulin47/3.mp4',
      '/videos/bulin47/4.mp4',
      '/videos/bulin47/5.mp4',
      '/videos/bulin47/6.mp4',
    ]);
    expect(videoTemplateExamples.map((template) => template.posterUrl)).toEqual(
      [
        '/images/video-templates/1.png',
        '/images/video-templates/2.png',
        '/images/video-templates/3.png',
        '/images/video-templates/4.png',
        '/images/video-templates/5.png',
        '/images/video-templates/6.png',
      ]
    );
  });
});
