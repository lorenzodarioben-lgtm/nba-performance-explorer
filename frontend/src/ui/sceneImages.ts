import { SCENE_IMAGE_DATA } from './sceneImageData';

/** An editorial photograph used as section imagery (not a player's profile photo). */
export interface SceneImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  objectPosition: string;
  alt: string;
}

export function getSceneImage(slug: string): SceneImage | undefined {
  return Object.prototype.hasOwnProperty.call(SCENE_IMAGE_DATA, slug)
    ? SCENE_IMAGE_DATA[slug]
    : undefined;
}
