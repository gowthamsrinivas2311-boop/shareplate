import cron from 'node-cron';
import { Listing } from '../models/Listing.js';
import { Reservation } from '../models/Reservation.js';

export const sweepExpiredListings = async () => {
  const now = new Date();
  try {
    // 1. Find all listings where status is 'active' or 'sold_out' AND (expiresAt <= now OR pickupEnd <= now)
    const expiredListings = await Listing.find({
      status: { $in: ['active', 'sold_out'] },
      $or: [
        { expiresAt: { $lte: now } },
        { pickupEnd: { $lte: now } }
      ]
    }).select('_id');

    if (expiredListings.length === 0) {
      return { expiredListingsCount: 0, noShowReservationsCount: 0 };
    }

    const listingIds = expiredListings.map((l) => l._id);

    // 2. Update them to status 'expired'
    const listingUpdateResult = await Listing.updateMany(
      { _id: { $in: listingIds } },
      { $set: { status: 'expired' } }
    );

    // 3. Update all reservations with status 'reserved' for those listings to 'no_show'
    const reservationUpdateResult = await Reservation.updateMany(
      { listingId: { $in: listingIds }, status: 'reserved' },
      { $set: { status: 'no_show' } }
    );

    // 4. Log count
    console.log(
      `[Cron] Expiry sweep completed: ${listingUpdateResult.modifiedCount} listing(s) marked expired, ${reservationUpdateResult.modifiedCount} reservation(s) marked no_show.`
    );

    return {
      expiredListingsCount: listingUpdateResult.modifiedCount,
      noShowReservationsCount: reservationUpdateResult.modifiedCount
    };
  } catch (error) {
    console.error('[Cron] Error during expiry sweep:', error.message);
    throw error;
  }
};

export const startCron = () => {
  const task = cron.schedule('* * * * *', async () => {
    try {
      await sweepExpiredListings();
    } catch (err) {
      console.error('[Cron] Scheduled sweep error:', err.message);
    }
  });

  console.log('[Cron] Expiry cron scheduled to run every minute.');
  return task;
};
