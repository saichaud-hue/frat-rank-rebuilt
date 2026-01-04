import { supabase } from "@/integrations/supabase/client";

export interface AllowedFileType {
  id: string;
  mime_type: string;
  extension: string;
  max_size_bytes: number;
  enabled: boolean;
}

// Cache for allowed file types
let cachedFileTypes: AllowedFileType[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch allowed file types from the database.
 * Results are cached for 5 minutes.
 */
export async function getAllowedFileTypes(): Promise<AllowedFileType[]> {
  const now = Date.now();
  
  if (cachedFileTypes && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedFileTypes;
  }

  try {
    const { data, error } = await supabase
      .from("allowed_file_types")
      .select("*")
      .eq("enabled", true);

    if (error) {
      console.error("Failed to fetch allowed file types:", error);
      // Return default types if fetch fails
      return getDefaultAllowedTypes();
    }

    cachedFileTypes = (data || []) as AllowedFileType[];
    cacheTimestamp = now;
    return cachedFileTypes;
  } catch (err) {
    console.error("Error fetching file types:", err);
    return getDefaultAllowedTypes();
  }
}

/**
 * Default allowed types if database fetch fails
 */
function getDefaultAllowedTypes(): AllowedFileType[] {
  return [
    { id: "1", mime_type: "image/jpeg", extension: "jpg", max_size_bytes: 10485760, enabled: true },
    { id: "2", mime_type: "image/png", extension: "png", max_size_bytes: 10485760, enabled: true },
    { id: "3", mime_type: "image/webp", extension: "webp", max_size_bytes: 10485760, enabled: true },
    { id: "4", mime_type: "image/gif", extension: "gif", max_size_bytes: 5242880, enabled: true },
  ];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  allowedType?: AllowedFileType;
}

/**
 * Validate a file against allowed file types.
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  const allowedTypes = await getAllowedFileTypes();
  
  // Find matching type by mime type
  const matchedType = allowedTypes.find(t => t.mime_type === file.type);
  
  if (!matchedType) {
    const allowedExtensions = allowedTypes.map(t => t.extension.toUpperCase()).join(", ");
    return {
      valid: false,
      error: `File type not allowed. Supported formats: ${allowedExtensions}`,
    };
  }

  if (file.size > matchedType.max_size_bytes) {
    const maxMB = Math.round(matchedType.max_size_bytes / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size for ${matchedType.extension.toUpperCase()}: ${maxMB}MB`,
    };
  }

  return {
    valid: true,
    allowedType: matchedType,
  };
}

/**
 * Validate multiple files and return results for each.
 */
export async function validateFiles(files: File[]): Promise<{
  validFiles: File[];
  errors: string[];
}> {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await validateFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { validFiles, errors };
}

/**
 * Strip EXIF data from an image file using the edge function.
 * Returns the cleaned file or the original if stripping fails.
 */
export async function stripExifData(file: File): Promise<File> {
  // Only process JPEG images
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
    return file;
  }

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Call edge function
    const { data, error } = await supabase.functions.invoke("strip-exif", {
      body: {
        imageBase64: base64,
        mimeType: file.type,
      },
    });

    if (error) {
      console.error("EXIF strip error:", error);
      return file;
    }

    if (!data?.stripped || !data?.imageBase64) {
      return file;
    }

    // Convert back to File
    const cleanedBinary = atob(data.imageBase64);
    const cleanedBytes = new Uint8Array(cleanedBinary.length);
    for (let i = 0; i < cleanedBinary.length; i++) {
      cleanedBytes[i] = cleanedBinary.charCodeAt(i);
    }

    const cleanedBlob = new Blob([cleanedBytes], { type: file.type });
    return new File([cleanedBlob], file.name, { type: file.type });
  } catch (err) {
    console.error("Failed to strip EXIF:", err);
    return file;
  }
}

/**
 * Get a human-readable string of allowed file types for display.
 */
export function getAcceptString(types: AllowedFileType[]): string {
  return types.map(t => t.mime_type).join(",");
}
