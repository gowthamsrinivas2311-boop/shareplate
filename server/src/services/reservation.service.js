import crypto from 'crypto';
import { Reservation } from '../models/Reservation.js';
import { Listing } from '../models/Listing.js';
import { AppError } from '../middleware/errorHandler.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generatePickupCode = (length = 6) => {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
};

export const createReservation = async (listingId, { reserverName, reserverContact, quantity }) => {
  const now = new Date();
  const pickupCode = generatePickupCode();

  // 1. Atomic decrement only if listing is active, not expired, and has enough quantity
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: 'active',
      expiresAt: { $gt: now },
      pickupEnd: { $gt: now },
      availableQuantity: { $gte: quantity }
    },
    { $inc: { availableQuantity: -quantity } },
    { new: true }
  );

  // 2. If update failed, query the listing to find the exact reason
  if (!updatedListing) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new AppError('Listing not found', 404, 'NOT_FOUND');
    }

    if (listing.status === 'cancelled') {
      throw new AppError('Listing has been cancelled', 409, 'LISTING_CANCELLED');
    }

    const effectiveDeadline = new Date(
      Math.min(new Date(listing.expiresAt).getTime(), new Date(listing.pickupEnd).getTime())
    );
    if (listing.status === 'expired' || effectiveDeadline <= now) {
      throw new AppError('Listing has expired', 409, 'LISTING_EXPIRED');
    }

    if (listing.availableQuantity === 0 || listing.status === 'sold_out') {
      throw new AppError('Listing is sold out', 409, 'LISTING_SOLD_OUT');
    }

    if (listing.availableQuantity < quantity) {
      throw new AppError(
        `Only ${listing.availableQuantity} ${listing.unit} left`,
        409,
        'INSUFFICIENT_QUANTITY'
      );
    }

    throw new AppError('Listing is not available for reservation', 409, 'RESERVATION_UNAVAILABLE');
  }

  // 3. Create Reservation document. If this fails, rollback the $inc
  let reservation;
  try {
    reservation = await Reservation.create({
      listingId,
      reserverName,
      reserverContact,
      quantity,
      pickupCode,
      status: 'reserved'
    });
  } catch (error) {
    // Rollback the decremented quantity
    await Listing.updateOne(
      { _id: listingId },
      { $inc: { availableQuantity: quantity } }
    );
    throw error;
  }

  // 4. If available quantity is now 0, conditionally mark status as 'sold_out'
  if (updatedListing.availableQuantity === 0) {
    await Listing.updateOne(
      { _id: listingId, status: 'active', availableQuantity: 0 },
      { $set: { status: 'sold_out' } }
    );
  }

  // 5. Return reservation with pickupCode manually attached
  const resJson = reservation.toJSON();
  resJson.pickupCode = pickupCode;
  return resJson;
};

export const cancelReservation = async (reservationId, pickupCode) => {
  const reservation = await Reservation.findById(reservationId).select('+pickupCode');
  if (!reservation) {
    throw new AppError('Reservation not found', 404, 'NOT_FOUND');
  }

  if (reservation.pickupCode !== pickupCode) {
    throw new AppError('Invalid pickup code', 400, 'INVALID_PICKUP_CODE');
  }

  if (reservation.status !== 'reserved') {
    throw new AppError(
      `Cannot cancel reservation with status '${reservation.status}'`,
      409,
      'INVALID_STATUS'
    );
  }

  const updatedReservation = await Reservation.findOneAndUpdate(
    { _id: reservationId, status: 'reserved' },
    { $set: { status: 'cancelled' } },
    { new: true }
  );

  if (!updatedReservation) {
    throw new AppError(
      'Reservation was already modified by another request',
      409,
      'CONCURRENT_MODIFICATION'
    );
  }

  // Return quantity to listing if active or sold_out and deadline has not passed
  const now = new Date();
  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: reservation.listingId,
      status: { $in: ['active', 'sold_out'] },
      expiresAt: { $gt: now },
      pickupEnd: { $gt: now }
    },
    { $inc: { availableQuantity: reservation.quantity } },
    { new: true }
  );

  if (updatedListing && updatedListing.status === 'sold_out' && updatedListing.availableQuantity > 0) {
    await Listing.updateOne(
      { _id: updatedListing._id, status: 'sold_out', availableQuantity: { $gt: 0 } },
      { $set: { status: 'active' } }
    );
  }

  return updatedReservation.toJSON();
};

export const collectReservation = async (reservationId, pickupCode) => {
  const reservation = await Reservation.findById(reservationId)
    .select('+pickupCode')
    .populate('listingId');

  if (!reservation) {
    throw new AppError('Reservation not found', 404, 'NOT_FOUND');
  }

  if (reservation.pickupCode !== pickupCode) {
    throw new AppError('Invalid pickup code', 400, 'INVALID_PICKUP_CODE');
  }

  if (reservation.status !== 'reserved') {
    throw new AppError(
      `Cannot collect reservation with status '${reservation.status}'`,
      409,
      'INVALID_STATUS'
    );
  }

  const listing = reservation.listingId;
  if (!listing) {
    throw new AppError('Associated listing not found', 404, 'NOT_FOUND');
  }

  const now = new Date();
  if (new Date(listing.pickupEnd) <= now) {
    throw new AppError('Pickup window has closed', 409, 'PICKUP_WINDOW_CLOSED');
  }

  const updatedReservation = await Reservation.findOneAndUpdate(
    { _id: reservationId, status: 'reserved' },
    { $set: { status: 'collected', collectedAt: now } },
    { new: true }
  );

  if (!updatedReservation) {
    throw new AppError(
      'Reservation was already modified by another request',
      409,
      'CONCURRENT_MODIFICATION'
    );
  }

  return updatedReservation.toJSON();
};

export const lookupReservation = async (contact, pickupCode) => {
  const reservation = await Reservation.findOne({
    reserverContact: contact.trim().toLowerCase(),
    pickupCode
  })
    .select('+pickupCode')
    .populate('listingId');

  if (!reservation) {
    return null;
  }

  const resJson = reservation.toJSON();
  resJson.pickupCode = reservation.pickupCode;
  return resJson;
};

export const getListingReservations = async (listingId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new AppError('Listing not found', 404, 'NOT_FOUND');
  }

  const reservations = await Reservation.find({ listingId }).sort({ createdAt: -1 });
  return reservations.map((r) => r.toJSON());
};
