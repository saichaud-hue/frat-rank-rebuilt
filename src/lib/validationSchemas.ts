import { z } from 'zod';

// Maximum lengths for security
const MAX_TEXT_SHORT = 100;
const MAX_TEXT_MEDIUM = 500;
const MAX_TEXT_LONG = 2000;
const MAX_EMAIL = 255;

// Common patterns
const sanitizeText = (text: string) => text.trim().replace(/\s+/g, ' ');

// Post/Message validation
export const postSchema = z.object({
  text: z
    .string()
    .min(1, 'Post cannot be empty')
    .max(MAX_TEXT_LONG, `Post must be less than ${MAX_TEXT_LONG} characters`)
    .transform(sanitizeText),
});

// Comment validation
export const commentSchema = z.object({
  text: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(MAX_TEXT_MEDIUM, `Comment must be less than ${MAX_TEXT_MEDIUM} characters`)
    .transform(sanitizeText),
  parent_comment_id: z.string().uuid().nullable().optional(),
});

// Party creation validation
export const partySchema = z.object({
  title: z
    .string()
    .min(1, 'Party name is required')
    .max(MAX_TEXT_SHORT, `Party name must be less than ${MAX_TEXT_SHORT} characters`)
    .transform(sanitizeText),
  fraternity_id: z.string().uuid('Invalid fraternity selected'),
  venue: z
    .string()
    .max(MAX_TEXT_SHORT, `Venue must be less than ${MAX_TEXT_SHORT} characters`)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),
  starts_at: z.string().datetime('Invalid start date'),
  ends_at: z.string().datetime('Invalid end date'),
  contact_email: z
    .string()
    .email('Invalid email address')
    .max(MAX_EMAIL, `Email must be less than ${MAX_EMAIL} characters`)
    .transform((val) => val.trim().toLowerCase()),
  type: z
    .string()
    .max(50, 'Type must be less than 50 characters')
    .optional(),
  invite_only: z.boolean().optional().default(false),
}).refine(
  (data) => new Date(data.ends_at) > new Date(data.starts_at),
  { message: 'End time must be after start time', path: ['ends_at'] }
);

// Rating validation (1-10 scale)
export const ratingValueSchema = z.number().min(0).max(10);

export const partyRatingSchema = z.object({
  party_id: z.string().uuid('Invalid party'),
  vibe_score: ratingValueSchema,
  music_score: ratingValueSchema,
  execution_score: ratingValueSchema,
  party_quality_score: ratingValueSchema,
});

export const reputationRatingSchema = z.object({
  fraternity_id: z.string().uuid('Invalid fraternity'),
  score: z.number().min(1, 'Minimum score is 1').max(10, 'Maximum score is 10'),
});

// Report validation
export const reportSchema = z.object({
  content_id: z.string().uuid('Invalid content ID'),
  content_type: z.enum(['party', 'party_comment', 'fraternity_comment', 'chat_message', 'party_photo']),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(50, 'Reason must be less than 50 characters'),
  description: z
    .string()
    .max(MAX_TEXT_MEDIUM, `Description must be less than ${MAX_TEXT_MEDIUM} characters`)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),
});

// Validate and return result
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T; 
} | { 
  success: false; 
  error: string; 
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Return first error message
  const firstError = result.error.errors[0];
  return { 
    success: false, 
    error: firstError?.message || 'Validation failed' 
  };
}
