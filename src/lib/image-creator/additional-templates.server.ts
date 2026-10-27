import type { ImageTemplate } from './templates.server';

const sharedNegativePrompt =
  'low quality, distorted details, watermark, unreadable text, extra limbs';

const posterPrompt = (style: string) =>
  `Create one complete 3:4 vertical poster from the uploaded reference image. ` +
  `Keep the subject identity, pose, clothing, important objects, and overall composition recognizable. ` +
  `Use a polished editorial poster layout with a clear visual hierarchy, generous breathing room, and tasteful typography. ` +
  `Translate the reference into ${style}. Do not add logos, watermarks, random text, borders, or unrelated objects.`;

export const additionalImageTemplateSeeds: readonly ImageTemplate[] = [
  {
    id: 'image-template-1025',
    name: 'Oversized Surreal Fashion Poster',
    category: 'Editorial',
    tags: ['editorial', 'fashion', 'surreal', '3:4'],
    description:
      'A bold editorial poster that turns ordinary subjects into oversized surreal fashion scenes.',
    coverUrl: '/images/image-templates/1025.png',
    exampleUrl: '/images/image-templates/1025.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'personal-brand',
    styleFamily: 'collage',
    revision: 1,
    basePrompt: posterPrompt(
      'an oversized-object fashion collage with playful scale contrast and a premium magazine finish'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1024',
    name: 'Natural Light Visual Study',
    category: 'Editorial',
    tags: ['editorial', 'nature', 'minimal', '3:4'],
    description:
      'A quiet visual-study poster built from natural light, organic forms, and restrained composition.',
    coverUrl: '/images/image-templates/1024.png',
    exampleUrl: '/images/image-templates/1024.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'travel',
    styleFamily: 'photo-editorial',
    revision: 1,
    basePrompt: posterPrompt(
      'a calm natural-light visual study with soft paper texture, elegant negative space, and poetic restraint'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1023',
    name: 'Prism Glass Fashion Portrait',
    category: 'Editorial',
    tags: ['editorial', 'fashion', 'glass', '3:4'],
    description:
      'A high-fashion portrait poster shaped by glass refraction, prism highlights, and luminous contrast.',
    coverUrl: '/images/image-templates/1023.png',
    exampleUrl: '/images/image-templates/1023.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'personal-brand',
    styleFamily: 'photo-editorial',
    revision: 1,
    basePrompt: posterPrompt(
      'luxurious glass refraction, prism highlights, translucent overlays, and a contemporary fashion-art direction'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1022',
    name: 'Green Geometry Fashion Portrait',
    category: 'Editorial',
    tags: ['editorial', 'fashion', 'geometric', '3:4'],
    description:
      'A modern fashion portrait with green geometric structures and a clean art-direction system.',
    coverUrl: '/images/image-templates/1022.png',
    exampleUrl: '/images/image-templates/1022.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'personal-brand',
    styleFamily: 'collage',
    revision: 1,
    basePrompt: posterPrompt(
      'green geometric framing, layered planes, crisp fashion styling, and a refined contemporary art direction'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1021',
    name: 'World Travel Scenic Poster',
    category: 'Editorial',
    tags: ['travel', 'scenic', 'editorial', '3:4'],
    description:
      'A cinematic travel poster for landmarks, mountains, coastlines, and memorable journeys.',
    coverUrl: '/images/image-templates/1021.png',
    exampleUrl: '/images/image-templates/1021.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'travel',
    styleFamily: 'photo-editorial',
    revision: 1,
    basePrompt: posterPrompt(
      'a cinematic travel editorial with atmospheric landscape depth, elegant destination-poster composition, and quiet grandeur'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1020',
    name: 'Seven Styles Filter Poster',
    category: 'Editorial',
    tags: ['editorial', 'filters', 'art', '3:4'],
    description:
      'A playful art-direction poster that presents one subject through a curated set of visual treatments.',
    coverUrl: '/images/image-templates/1020.png',
    exampleUrl: '/images/image-templates/1020.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'social',
    styleFamily: 'collage',
    revision: 1,
    basePrompt: posterPrompt(
      'a curated multi-panel art-filter showcase with distinct but harmonious visual treatments and clear editorial labeling'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1019',
    name: 'Travel Landscape Editorial',
    category: 'Editorial',
    tags: ['travel', 'landscape', 'poster', '3:4'],
    description:
      'A refined destination poster for coastlines, villages, bridges, and quiet landscape stories.',
    coverUrl: '/images/image-templates/1019.png',
    exampleUrl: '/images/image-templates/1019.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'travel',
    styleFamily: 'poster-print',
    revision: 1,
    basePrompt: posterPrompt(
      'a print-inspired travel poster with strong landscape silhouette, warm paper texture, and timeless destination storytelling'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1018',
    name: 'Glass Light Dream Poster',
    category: 'Editorial',
    tags: ['editorial', 'glass', 'dreamy', '3:4'],
    description:
      'A luminous dreamlike poster using glass reflections, water light, and soft summer color.',
    coverUrl: '/images/image-templates/1018.png',
    exampleUrl: '/images/image-templates/1018.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'cinematic',
    styleFamily: 'collage',
    revision: 1,
    basePrompt: posterPrompt(
      'dreamy glass reflections, watery caustics, luminous highlights, and a soft cinematic summer palette'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1017',
    name: 'Spring Garden Story Poster',
    category: 'Editorial',
    tags: ['editorial', 'spring', 'nature', '3:4'],
    description:
      'A gentle spring poster combining flowers, animals, landscapes, and everyday outdoor moments.',
    coverUrl: '/images/image-templates/1017.png',
    exampleUrl: '/images/image-templates/1017.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'social',
    styleFamily: 'hand-drawn',
    revision: 1,
    basePrompt: posterPrompt(
      'a gentle spring garden story with fresh greens, floral details, hand-painted accents, and an optimistic editorial mood'
    ),
    negativePrompt: sharedNegativePrompt,
  },
  {
    id: 'image-template-1016',
    name: 'Sunshine Day Illustrated Poster',
    category: 'Editorial',
    tags: ['editorial', 'summer', 'illustration', '3:4'],
    description:
      'A cheerful summer poster that transforms a reference photo into a bright illustrated story.',
    coverUrl: '/images/image-templates/1016.png',
    exampleUrl: '/images/image-templates/1016.png',
    inputPolicy: 'optional',
    defaultMode: '2K_HD',
    defaultRatio: '3:4',
    defaultCount: 1,
    useCase: 'social',
    styleFamily: 'hand-drawn',
    revision: 1,
    basePrompt: posterPrompt(
      'a bright summer illustration with warm sunlight, simplified shapes, playful botanical forms, and a cheerful magazine finish'
    ),
    negativePrompt: sharedNegativePrompt,
  },
];
