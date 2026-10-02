import type { FileUIPart } from 'ai';

export const IMAGE_MAX_SIDE = 1280;
export const IMAGE_QUALITY = 0.82;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_FILES = 4;
export const IMAGE_ONLY_PROMPT = 'What do you see in this image?';

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the image'));
    image.src = url;
  });

export const fitWithin = (width: number, height: number, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

export const downscaleImage = async (
  part: FileUIPart,
  maxSide = IMAGE_MAX_SIDE,
): Promise<FileUIPart> => {
  if (!part.mediaType.startsWith('image/') || part.mediaType === 'image/gif') return part;
  const image = await loadImage(part.url);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return part;
  context.drawImage(image, 0, 0, width, height);
  return { ...part, mediaType: 'image/jpeg', url: canvas.toDataURL('image/jpeg', IMAGE_QUALITY) };
};

export const prepareImages = (parts: FileUIPart[]): Promise<FileUIPart[]> =>
  Promise.all(parts.map((part) => downscaleImage(part).catch(() => part)));
