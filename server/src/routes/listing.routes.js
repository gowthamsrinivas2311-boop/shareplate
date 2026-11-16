import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
  listingParamsSchema
} from '../schemas/listing.schema.js';
import { createReservationSchema } from '../schemas/reservation.schema.js';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  cancelListing
} from '../services/listing.service.js';
import {
  createReservation,
  getListingReservations
} from '../services/reservation.service.js';

const router = Router();

// GET /api/listings
router.get(
  '/',
  validateQuery(listingQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await getListings(req.query);
    res.json({
      success: true,
      data: result.listings,
      pagination: result.pagination
    });
  })
);

// POST /api/listings
router.post(
  '/',
  validateBody(createListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await createListing(req.body);
    res.status(201).json({
      success: true,
      data: listing
    });
  })
);

// GET /api/listings/:id
router.get(
  '/:id',
  validateParams(listingParamsSchema),
  asyncHandler(async (req, res) => {
    const listing = await getListing(req.params.id);
    res.json({
      success: true,
      data: listing
    });
  })
);

// PATCH /api/listings/:id
router.patch(
  '/:id',
  validateParams(listingParamsSchema),
  validateBody(updateListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await updateListing(req.params.id, req.body);
    res.json({
      success: true,
      data: listing
    });
  })
);

// PATCH /api/listings/:id/cancel
router.patch(
  '/:id/cancel',
  validateParams(listingParamsSchema),
  asyncHandler(async (req, res) => {
    const listing = await cancelListing(req.params.id);
    res.json({
      success: true,
      data: listing
    });
  })
);

// POST /api/listings/:id/reservations
router.post(
  '/:id/reservations',
  validateParams(listingParamsSchema),
  validateBody(createReservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await createReservation(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: reservation
    });
  })
);

// GET /api/listings/:id/reservations
router.get(
  '/:id/reservations',
  validateParams(listingParamsSchema),
  asyncHandler(async (req, res) => {
    const reservations = await getListingReservations(req.params.id);
    res.json({
      success: true,
      data: reservations
    });
  })
);

export default router;
