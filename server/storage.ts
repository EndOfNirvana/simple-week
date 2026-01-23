import { createClient } from '@supabase/supabase-js';

// Supabase Storage configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'images';

/**
 * Upload a file to Supabase Storage
 * @param key - The file path/key in the bucket
 * @param body - The file content as Buffer
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, body, {
      contentType: contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return urlData.publicUrl;
}

/**
 * Get a public URL for a file
 * @param key - The file path/key in the bucket
 * @returns Public URL for the file
 */
export async function getSignedUrlForFile(key: string): Promise<string> {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param key - The file path/key in the bucket
 */
export async function deleteFromStorage(key: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([key]);

  if (error) {
    console.error('Supabase Storage delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
