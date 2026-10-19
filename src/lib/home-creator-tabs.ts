export type CreatorSurface = 'video' | 'image';
export type VideoCreatorTab = 'bulin47' | 'duet';

export type CreatorTabState = {
  surface: CreatorSurface;
  videoTab: VideoCreatorTab;
};

export function getCreatorTabState(hash: string): CreatorTabState {
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  if (normalizedHash === '#image' || normalizedHash === '#create') {
    return { surface: 'image', videoTab: 'bulin47' };
  }
  if (normalizedHash === '#video-duet') {
    return { surface: 'video', videoTab: 'duet' };
  }
  if (normalizedHash === '#video') {
    return { surface: 'video', videoTab: 'bulin47' };
  }
  return { surface: 'image', videoTab: 'bulin47' };
}

export function getCreatorTabHash(state: CreatorTabState) {
  if (state.surface === 'image') return '#image';
  return state.videoTab === 'duet' ? '#video-duet' : '#video';
}
