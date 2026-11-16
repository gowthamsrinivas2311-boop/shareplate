import { z } from 'zod';
import { objectIdSchema } from './common.schema.js';

export const reservationParamsSchema = z.object({
  id: objectIdSchema
});

export const listingReservationParamsSchema = z.object({
  id: objectIdSchema
});

export const createReservationSchema = z.object({
  reserverName: z.string().trim().min(1, 'Reserver name is required'),
  reserverContact: z.string().trim().toLowerCase().min(1, 'Reserver contact is required'),
  quantity: z.coerce.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1')
});

export const pickupCodeSchema = z.object({
  pickupCode: z.string().length(6, 'Pickup code must be exactly 6 characters')
});

export const reservationLookupSchema = z.object({
  contact: z.string().trim().toLowerCase().min(1, 'Contact is required'),
  pickupCode: z.string().length(6, 'Pickup code must be exactly 6 characters')
});
