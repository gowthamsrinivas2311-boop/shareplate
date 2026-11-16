import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './common.schema.js';

export const listingParamsSchema = z.object({
  id: objectIdSchema
});

export const createListingSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().default(''),
    category: z.enum(['cooked', 'packaged', 'produce', 'bakery', 'other']),
    donorName: z.string().trim().min(1, 'Donor name is required'),
    donorContact: z.string().trim().toLowerCase().min(1, 'Donor contact is required'),
    address: z.string().trim().min(1, 'Address is required'),
    totalQuantity: z.coerce.number().int('Total quantity must be an integer').min(1, 'Total quantity must be at least 1'),
    unit: z.enum(['portions', 'kg', 'packs']),
    pickupStart: z.coerce.date(),
    pickupEnd: z.coerce.date(),
    expiresAt: z.coerce.date()
  })
  .refine((data) => data.pickupEnd > data.pickupStart, {
    message: 'pickupEnd must be after pickupStart',
    path: ['pickupEnd']
  })
  .refine((data) => data.pickupEnd.getTime() > Date.now(), {
    message: 'pickupEnd must be in the future',
    path: ['pickupEnd']
  })
  .refine((data) => data.expiresAt.getTime() > Date.now(), {
    message: 'expiresAt must be in the future',
    path: ['expiresAt']
  });

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters').optional(),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    category: z.enum(['cooked', 'packaged', 'produce', 'bakery', 'other']).optional(),
    donorName: z.string().trim().min(1, 'Donor name cannot be empty').optional(),
    donorContact: z.string().trim().toLowerCase().min(1, 'Donor contact cannot be empty').optional(),
    address: z.string().trim().min(1, 'Address cannot be empty').optional(),
    totalQuantity: z.coerce.number().int('Total quantity must be an integer').min(1, 'Total quantity must be at least 1').optional(),
    unit: z.enum(['portions', 'kg', 'packs']).optional(),
    pickupStart: z.coerce.date().optional(),
    pickupEnd: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional()
  })
  .refine(
    (data) => {
      if (data.pickupStart && data.pickupEnd) {
        return data.pickupEnd > data.pickupStart;
      }
      return true;
    },
    {
      message: 'pickupEnd must be after pickupStart',
      path: ['pickupEnd']
    }
  )
  .refine(
    (data) => {
      if (data.pickupEnd) {
        return data.pickupEnd.getTime() > Date.now();
      }
      return true;
    },
    {
      message: 'pickupEnd must be in the future',
      path: ['pickupEnd']
    }
  )
  .refine(
    (data) => {
      if (data.expiresAt) {
        return data.expiresAt.getTime() > Date.now();
      }
      return true;
    },
    {
      message: 'expiresAt must be in the future',
      path: ['expiresAt']
    }
  );

export const listingQuerySchema = paginationSchema.extend({
  status: z.enum(['open', 'active', 'sold_out', 'expired', 'cancelled', 'all']).default('open'),
  category: z.enum(['cooked', 'packaged', 'produce', 'bakery', 'other']).optional(),
  search: z.string().trim().optional(),
  donorContact: z.string().trim().toLowerCase().optional()
});
