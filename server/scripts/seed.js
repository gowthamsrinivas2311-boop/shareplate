import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Listing } from '../src/models/Listing.js';
import { Reservation } from '../src/models/Reservation.js';

const seed = async () => {
  try {
    await connectDB();

    console.log('Clearing existing listings and reservations...');
    await Promise.all([
      Listing.deleteMany({}),
      Reservation.deleteMany({})
    ]);

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    const listingsData = [
      {
        title: 'Leftover Biryani from Weekend Catering',
        description: 'Surplus chicken and veg dum biryani freshly prepared for an event. Packed in insulated containers.',
        category: 'cooked',
        donorName: 'Royal Spice Caterers',
        donorContact: 'contact@royalspice.in',
        address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
        totalQuantity: 15,
        availableQuantity: 15,
        unit: 'portions',
        pickupStart: new Date(now - 30 * 60 * 1000),
        pickupEnd: new Date(now + 2 * HOUR),
        expiresAt: new Date(now + 2 * HOUR),
        status: 'active'
      },
      {
        title: 'Fresh Idli-Vada Breakfast Packs',
        description: 'Warm idli-vada combo packs with coconut chutney and sambar packed separately.',
        category: 'cooked',
        donorName: 'South Tiffin House',
        donorContact: 'hello@southtiffin.com',
        address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
        totalQuantity: 20,
        availableQuantity: 20,
        unit: 'packs',
        pickupStart: new Date(now + 1 * HOUR),
        pickupEnd: new Date(now + 8 * HOUR),
        expiresAt: new Date(now + 8 * HOUR),
        status: 'active'
      },
      {
        title: 'Organic Vegetable Box Surplus',
        description: 'Assorted seasonal vegetables including tomatoes, spinach, cucumbers, and carrots.',
        category: 'produce',
        donorName: 'Green Earth Farm Outlet',
        donorContact: 'farm@greenearth.org',
        address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, Karnataka 560102',
        totalQuantity: 8,
        availableQuantity: 8,
        unit: 'kg',
        pickupStart: new Date(now),
        pickupEnd: new Date(now + 24 * HOUR),
        expiresAt: new Date(now + 24 * HOUR),
        status: 'active'
      },
      {
        title: 'Bakery Bread & Pastries End of Day',
        description: 'Fresh sourdough loaves, croissants, and fruit danishes baked this morning.',
        category: 'bakery',
        donorName: 'Artisan Crust Bakery',
        donorContact: 'orders@artisancrust.in',
        address: '9th Main, 4th Block, Jayanagar, Bengaluru, Karnataka 560011',
        totalQuantity: 25,
        availableQuantity: 0,
        unit: 'packs',
        pickupStart: new Date(now - 1 * HOUR),
        pickupEnd: new Date(now + 3 * HOUR),
        expiresAt: new Date(now + 4 * HOUR),
        status: 'sold_out'
      },
      {
        title: 'Packaged Snacks from Event',
        description: 'Sealed assorted snack bars, juice boxes, and roasted nuts.',
        category: 'packaged',
        donorName: 'TechPark Events Co',
        donorContact: 'events@techparkhub.com',
        address: 'ITPL Main Rd, Whitefield, Bengaluru, Karnataka 560066',
        totalQuantity: 30,
        availableQuantity: 30,
        unit: 'packs',
        pickupStart: new Date(now - 10 * HOUR),
        pickupEnd: new Date(now - 3 * HOUR),
        expiresAt: new Date(now - 2 * HOUR),
        status: 'expired'
      },
      {
        title: 'Chapati & Dal Community Kitchen',
        description: 'Nutritious whole wheat chapatis with mixed lentil tadka dal and pickle.',
        category: 'cooked',
        donorName: 'Annapurna Seva Kitchen',
        donorContact: 'seva@annapurnakitchen.org',
        address: 'Sampige Road, 8th Cross, Malleshwaram, Bengaluru, Karnataka 560003',
        totalQuantity: 40,
        availableQuantity: 40,
        unit: 'portions',
        pickupStart: new Date(now + 30 * 60 * 1000),
        pickupEnd: new Date(now + 5 * HOUR),
        expiresAt: new Date(now + 6 * HOUR),
        status: 'active'
      }
    ];

    const createdListings = await Listing.insertMany(listingsData);
    console.log(`Successfully seeded ${createdListings.length} listings:`);
    createdListings.forEach((item) => {
      console.log(`- [${item.status.toUpperCase()}] ${item.title} (${item.availableQuantity}/${item.totalQuantity} ${item.unit}) ID: ${item._id}`);
    });

    await disconnectDB();
    console.log('Seeding finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    await disconnectDB();
    process.exit(1);
  }
};

seed();
