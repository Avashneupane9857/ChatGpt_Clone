/* eslint-disable @typescript-eslint/no-explicit-any */
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (
  fileBuffer: Buffer, 
  fileName: string, 
  fileType: string
): Promise<{ url: string; publicId: string }> => {
  try {
    const resourceType = fileType.startsWith('image/') ? 'image' : 'raw';
    
    const result = await cloudinary.uploader.upload(
      `data:${fileType};base64,${fileBuffer.toString('base64')}`,
      {
        resource_type: resourceType,
        public_id: `chat-files/${Date.now()}-${fileName}`,
        folder: 'chat-app',
        use_filename: true,
        unique_filename: false,
      }
    );
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
};

// Get optimized image URL
export const getOptimizedImageUrl = (
  publicId: string, 
  width: number = 400, 
  height: number = 300
): string => {
  return cloudinary.url(publicId, {
    width: width,
    height: height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
};

export default cloudinary;