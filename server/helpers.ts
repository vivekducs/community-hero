export async function getImagePart(imageUrl: string): Promise<any | null> {
  if (!imageUrl) return null;
  
  try {
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        return {
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        };
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return {
          inlineData: {
            mimeType,
            data: base64
          }
        };
      }
    }
  } catch (error) {
    console.error("Failed to parse or fetch image for Gemini:", error);
  }
  return null;
}

export function getCoordinatesDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return 12742000 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // Distance in meters
}
