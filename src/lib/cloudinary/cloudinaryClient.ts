import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Extrai o public_id de uma URL do Cloudinary (necessário pra apagar um arquivo,
// já que a API de destroy pede o public_id, não a URL).
// Ex: https://res.cloudinary.com/istttu84/image/upload/v123456/ecoblaster/abc.jpg
//  -> ecoblaster/abc
export function publicIdFromCloudinaryUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
}
