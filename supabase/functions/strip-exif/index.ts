import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Strip EXIF metadata from JPEG images.
 * EXIF data can contain sensitive location information that we don't want to store.
 * 
 * This function:
 * 1. Accepts a base64-encoded image
 * 2. Removes EXIF data from JPEG images
 * 3. Returns the cleaned image as base64
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only process JPEG images - other formats don't have EXIF or it's less common
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
      console.log(`Skipping EXIF strip for non-JPEG: ${mimeType}`);
      return new Response(
        JSON.stringify({ 
          imageBase64, 
          stripped: false,
          reason: 'Not a JPEG image'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 to bytes
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Strip EXIF data from JPEG
    const cleanedBytes = stripExifFromJpeg(bytes);

    // Encode back to base64
    let binary = '';
    for (let i = 0; i < cleanedBytes.length; i++) {
      binary += String.fromCharCode(cleanedBytes[i]);
    }
    const cleanedBase64 = btoa(binary);

    console.log(`EXIF stripped: ${bytes.length} -> ${cleanedBytes.length} bytes`);

    return new Response(
      JSON.stringify({ 
        imageBase64: cleanedBase64, 
        stripped: true,
        originalSize: bytes.length,
        cleanedSize: cleanedBytes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error stripping EXIF:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process image', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Strip EXIF data from JPEG bytes.
 * 
 * JPEG structure:
 * - Starts with SOI marker: FF D8
 * - Followed by segments, each starting with FF XX (marker)
 * - APP1 (FF E1) contains EXIF data
 * - We remove APP1 segments while keeping everything else
 */
function stripExifFromJpeg(bytes: Uint8Array): Uint8Array {
  // Check for JPEG SOI marker
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    console.log('Not a valid JPEG (missing SOI marker)');
    return bytes;
  }

  const result: number[] = [];
  let i = 0;

  // Copy SOI marker
  result.push(bytes[i++], bytes[i++]);

  while (i < bytes.length - 1) {
    // Look for marker
    if (bytes[i] !== 0xFF) {
      // Not a marker, copy and continue
      result.push(bytes[i++]);
      continue;
    }

    const marker = bytes[i + 1];

    // End of image or start of scan (no more metadata after SOS)
    if (marker === 0xD9 || marker === 0xDA) {
      // Copy rest of file
      while (i < bytes.length) {
        result.push(bytes[i++]);
      }
      break;
    }

    // APP1 marker (EXIF) - skip it
    if (marker === 0xE1) {
      // Get segment length (big-endian, includes length bytes)
      const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
      console.log(`Skipping APP1 (EXIF) segment: ${segmentLength} bytes`);
      i += 2 + segmentLength; // Skip marker + segment
      continue;
    }

    // Other markers with length field
    if (marker >= 0xE0 && marker <= 0xEF) {
      // APP0-APP15 markers - keep them (except APP1 handled above)
      const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
      for (let j = 0; j < 2 + segmentLength && i + j < bytes.length; j++) {
        result.push(bytes[i + j]);
      }
      i += 2 + segmentLength;
      continue;
    }

    // DQT, DHT, DRI, SOF, etc - keep these
    if ((marker >= 0xC0 && marker <= 0xCF) || marker === 0xDB || marker === 0xC4 || marker === 0xDD) {
      const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
      for (let j = 0; j < 2 + segmentLength && i + j < bytes.length; j++) {
        result.push(bytes[i + j]);
      }
      i += 2 + segmentLength;
      continue;
    }

    // RST markers (no length)
    if (marker >= 0xD0 && marker <= 0xD7) {
      result.push(bytes[i++], bytes[i++]);
      continue;
    }

    // Unknown marker - copy it
    result.push(bytes[i++]);
  }

  return new Uint8Array(result);
}
