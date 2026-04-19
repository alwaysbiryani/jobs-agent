import { z } from 'zod';

export const jobViewSchema = z.enum(['new', 'saved', 'applied', 'interviewing', 'dismissed', 'all']);

export const jobActionSchema = z.enum(['seen', 'saved', 'dismissed', 'applied', 'interviewing', 'clear']);

export const setJobActionBodySchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  action: jobActionSchema,
});

const csvOrArraySchema = z.union([z.string(), z.array(z.string())]).transform((value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
});

export const userPreferencesInputSchema = z.object({
  roles: csvOrArraySchema.default([]),
  locations: csvOrArraySchema.default([]),
  work_modes: csvOrArraySchema.default([]),
  seniority: csvOrArraySchema.default([]),
  must_have_keywords: csvOrArraySchema.default([]),
  excluded_keywords: csvOrArraySchema.default([]),
});

export const upsertUserPreferencesBodySchema = z.object({
  userId: z.string().uuid(),
  preferences: userPreferencesInputSchema,
});
