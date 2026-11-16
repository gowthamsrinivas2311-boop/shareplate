import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  pickupCodeSchema,
  reservationLookupSchema,
  reservationParamsSchema
} from '../schemas/reservation.schema.js';
import {
  lookupReservation,
  cancelReservation,
  collectReservation
} from '../services/reservation.service.js';

const router = Router();

// GET /api/reservations/lookup (must be registered BEFORE /:id routes)
router.get(
  '/lookup',
  validateQuery(reservationLookupSchema),
  asyncHandler(async (req, res) => {
    const reservation = await lookupReservation(req.query.contact, req.query.pickupCode);
    if (!reservation) {
      throw new AppError('Reservation not found', 404, 'NOT_FOUND');
    }
    res.json({
      success: true,
      data: reservation
    });
  })
);

// PATCH /api/reservations/:id/cancel
router.patch(
  '/:id/cancel',
  validateParams(reservationParamsSchema),
  validateBody(pickupCodeSchema),
  asyncHandler(async (req, res) => {
    const reservation = await cancelReservation(req.params.id, req.body.pickupCode);
    res.json({
      success: true,
      data: reservation
    });
  })
);

// PATCH /api/reservations/:id/collect
router.patch(
  '/:id/collect',
  validateParams(reservationParamsSchema),
  validateBody(pickupCodeSchema),
  asyncHandler(async (req, res) => {
    const reservation = await collectReservation(req.params.id, req.body.pickupCode);
    res.json({
      success: true,
      data: reservation
    });
  })
);

export default router;
