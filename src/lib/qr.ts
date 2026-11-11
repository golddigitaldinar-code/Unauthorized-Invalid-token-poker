import defaultQrAsset from '@/assets/payment-qr.jpg.asset.json';

/** The owner's payment QR, used until the admin uploads a different one. */
export const DEFAULT_QR_IMAGE = defaultQrAsset.url;

const MAX_QR_IMAGE_CHARS = 500_000;
const MAX_QR_IMAGE_SIDE = 640;

export async function fileToQrDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_QR_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read this image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let dataUrl = canvas.toDataURL('image/png');
  if (dataUrl.length > MAX_QR_IMAGE_CHARS) dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  if (dataUrl.length > MAX_QR_IMAGE_CHARS) throw new Error('This image is too large. Try a smaller screenshot.');
  return dataUrl;
}
