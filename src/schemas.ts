import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0)
});

export const sortDirectionSchema = z.enum(['ASC', 'DESC']).optional().default('DESC');

// Authentication schemas
export const validateTokenSchema = z.object({});

export const revokeTokenSchema = z.object({});

// Document schemas
export const searchDocumentsSchema = z.object({
  query: z.string().min(1).max(2000),
  collectionId: z.string().uuid().optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
  dateFilter: z.enum(['day', 'week', 'month', 'year']).optional(),
  limit: z.number().int().min(1).max(25).optional().default(10),
  cmsOnly: z.boolean().optional().default(false)
});

export const listDocumentsSchema = z.object({
  collectionId: z.string().uuid().optional(),
  parentDocumentId: z.string().uuid().nullable().optional(),
  template: z.boolean().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).optional().default('updatedAt'),
  direction: sortDirectionSchema,
  ...paginationSchema.shape
});

export const getDocumentSchema = z.object({
  id: z.string().min(1)
});

export const createDocumentSchema = z.object({
  title: z.string().optional().default(''),
  text: z.string().optional().default(''),
  collectionId: z.string().uuid(),
  parentDocumentId: z.string().uuid().optional(),
  publish: z.boolean().optional().default(true),
  template: z.boolean().optional().default(false),
  templateId: z.string().uuid().optional()
});

export const updateDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  text: z.string().optional(),
  publish: z.boolean().optional(),
  fullWidth: z.boolean().optional(),
  collectionId: z.string().uuid().optional(),
  siteEnabled: z.boolean().optional()
});

export const moveDocumentSchema = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  parentDocumentId: z.string().uuid().nullable().optional(),
  index: z.number().int().min(0).optional()
});

export const deleteDocumentSchema = z.object({
  id: z.string().min(1),
  permanent: z.boolean().optional().default(false)
});

// Collection schemas
export const listCollectionsSchema = z.object({
  sortBy: z.enum(['updatedAt', 'index', 'name']).optional().default('updatedAt'),
  direction: sortDirectionSchema,
  ...paginationSchema.shape
});

export const getCollectionSchema = z.object({
  id: z.string().min(1)
});

export const createCollectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  permission: z.enum(['read', 'read_write']).optional(),
  sharing: z.boolean().optional(),
  siteEnabled: z.boolean().optional()
});

export const updateCollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  permission: z.enum(['read', 'read_write']).nullable().optional(),
  sharing: z.boolean().optional(),
  siteEnabled: z.boolean().optional()
});

export const deleteCollectionSchema = z.object({
  id: z.string().min(1)
});

// Analytics schemas
export const getAnalyticsThreadsSchema = z.object({
  dateRange: z.object({
    from: z.number(),
    to: z.number()
  }),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  sources: z.array(z.string()).optional(),
  status: z.array(z.enum(['answered', 'partial', 'unable_to_help', 'technical_issue', 'skipped'])).optional(),
  feedback: z.array(z.enum(['positive', 'negative'])).optional(),
  searchQuery: z.string().optional(),
  actions: z.array(z.string()).optional()
});

// AI Agent schemas
export const generateAnswerSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().regex(/^[0-9a-z]{25}$/).optional()
});

export const generateUserAnswerSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().regex(/^[0-9a-z]{25}$/).optional(),
  stream: z.boolean().optional().default(true),
  collectionIds: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.object({
    type: z.literal('image'),
    url: z.string().url()
  })).max(10).optional()
});