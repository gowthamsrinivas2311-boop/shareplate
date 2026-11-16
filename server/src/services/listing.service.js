import { Listing } from '../models/Listing.js';
import { Reservation } from '../models/Reservation.js';
import { AppError } from '../middleware/errorHandler.js';

export const createListing = async (data) => {
  const listingData = {
    ...data,
    availableQuantity: data.totalQuantity
  };
  const listing = await Listing.create(listingData);
  return listing.toJSON();
};

export const getListings = async (query = {}) => {
  const {
    page = 1,
    limit = 12,
    status = 'open',
    category,
    search,
    donorContact
  } = query;

  const filter = {};
  const now = new Date();

  if (status === 'open') {
    filter.status = 'active';
    filter.expiresAt = { $gt: now };
    filter.pickupEnd = { $gt: now };
  } else if (status === 'active') {
    filter.status = 'active';
  } else if (status === 'all') {
    // no status filter
  } else {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  if (donorContact) {
    filter.donorContact = donorContact.trim().toLowerCase();
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Listing.countDocuments(filter)
  ]);

  const pages = Math.ceil(total / Number(limit)) || 1;

  return {
    listings: listings.map((l) => l.toJSON()),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages
    }
  };
};

export const getListing = async (id) => {
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new AppError('Listing not found', 404, 'NOT_FOUND');
  }

  const now = new Date();
  const effectiveDeadline = new Date(
    Math.min(new Date(listing.expiresAt).getTime(), new Date(listing.pickupEnd).getTime())
  );

  if ((listing.status === 'active' || listing.status === 'sold_out') && effectiveDeadline <= now) {
    listing.status = 'expired';
    await Listing.updateOne({ _id: id }, { $set: { status: 'expired' } });
  }

  return listing.toJSON();
};

export const updateListing = async (id, data) => {
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new AppError('Listing not found', 404, 'NOT_FOUND');
  }

  const now = new Date();
  const effectiveDeadline = new Date(
    Math.min(new Date(listing.expiresAt).getTime(), new Date(listing.pickupEnd).getTime())
  );

  if (listing.status !== 'active') {
    throw new AppError(`Cannot update listing with status '${listing.status}'`, 409, 'INVALID_STATUS');
  }

  if (effectiveDeadline <= now) {
    throw new AppError('Cannot update expired listing', 409, 'LISTING_EXPIRED');
  }

  if (data.totalQuantity !== undefined && data.totalQuantity !== listing.totalQuantity) {
    const reservedAmount = listing.totalQuantity - listing.availableQuantity;
    if (data.totalQuantity < reservedAmount) {
      throw new AppError(
        `Cannot reduce below reserved amount (${reservedAmount} reserved)`,
        400,
        'INVALID_QUANTITY'
      );
    }

    const delta = data.totalQuantity - listing.totalQuantity;
    const oldTotal = listing.totalQuantity;
    const { totalQuantity, ...otherFields } = data;
    const setFields = { ...otherFields, totalQuantity };

    const updated = await Listing.findOneAndUpdate(
      { _id: id, totalQuantity: oldTotal },
      {
        $inc: { availableQuantity: delta },
        $set: setFields
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new AppError(
        'Listing was modified concurrently. Please retry.',
        409,
        'CONCURRENT_MODIFICATION'
      );
    }

    if (updated.availableQuantity === 0 && updated.status === 'active') {
      updated.status = 'sold_out';
      await Listing.updateOne({ _id: id }, { $set: { status: 'sold_out' } });
    } else if (updated.availableQuantity > 0 && updated.status === 'sold_out') {
      updated.status = 'active';
      await Listing.updateOne({ _id: id }, { $set: { status: 'active' } });
    }

    return updated.toJSON();
  }

  const updated = await Listing.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );

  return updated.toJSON();
};

export const cancelListing = async (id) => {
  const updatedListing = await Listing.findOneAndUpdate(
    { _id: id, status: { $in: ['active', 'sold_out'] } },
    { $set: { status: 'cancelled' } },
    { new: true }
  );

  if (!updatedListing) {
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new AppError('Listing not found', 404, 'NOT_FOUND');
    }
    if (listing.status === 'cancelled') {
      throw new AppError('Listing is already cancelled', 409, 'ALREADY_CANCELLED');
    }
    if (listing.status === 'expired') {
      throw new AppError('Cannot cancel an expired listing', 409, 'LISTING_EXPIRED');
    }
    throw new AppError(`Cannot cancel listing with status '${listing.status}'`, 409, 'INVALID_STATUS');
  }

  // Bulk update all 'reserved' reservations for this listing to 'cancelled'
  await Reservation.updateMany(
    { listingId: id, status: 'reserved' },
    { $set: { status: 'cancelled' } }
  );

  return updatedListing.toJSON();
};
