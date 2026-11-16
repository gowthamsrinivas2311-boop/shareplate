import { connectDB, disconnectDB } from '../src/config/db.js';
import { Listing } from '../src/models/Listing.js';
import { Reservation } from '../src/models/Reservation.js';
import app from '../src/app.js';

const runConcurrencyTest = async () => {
  let server;
  let testListingId;

  try {
    await connectDB();

    // Start ephemeral HTTP server for testing
    server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;
    console.log(`Ephemeral test server running at ${baseUrl}`);

    // Create test listing with 5 total and 5 available
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const testListing = await Listing.create({
      title: 'Concurrency Test Biryani Feast',
      description: 'Test listing to verify atomic reservation concurrency under load.',
      category: 'cooked',
      donorName: 'Concurrency Test Lab',
      donorContact: 'lab@concurrency.test',
      address: '100 Test St, Bengaluru',
      totalQuantity: 5,
      availableQuantity: 5,
      unit: 'portions',
      pickupStart: new Date(now),
      pickupEnd: new Date(now + 2 * HOUR),
      expiresAt: new Date(now + 3 * HOUR),
      status: 'active'
    });

    testListingId = testListing._id.toString();
    console.log(`Created test listing ${testListingId} with 5 portions.`);

    // Fire 20 parallel reservations for 1 portion each
    console.log('Dispatching 20 parallel reservation requests...');
    const reservationPromises = Array.from({ length: 20 }, (_, index) => {
      return fetch(`${baseUrl}/listings/${testListingId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reserverName: `Tester ${index + 1}`,
          reserverContact: `tester${index + 1}@example.com`,
          quantity: 1
        })
      });
    });

    const results = await Promise.allSettled(reservationPromises);

    let count201 = 0;
    let count409 = 0;
    const unexpectedResponses = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (response.status === 201) {
          count201++;
        } else if (response.status === 409) {
          count409++;
        } else {
          const body = await response.json().catch(() => ({}));
          unexpectedResponses.push({ status: response.status, body });
        }
      } else {
        unexpectedResponses.push({ error: result.reason.message });
      }
    }

    console.log(`\nResults:`);
    console.log(`- 201 Created: ${count201}`);
    console.log(`- 409 Conflict: ${count409}`);
    if (unexpectedResponses.length > 0) {
      console.error('- Unexpected responses:', unexpectedResponses);
    }

    // Verify assertions
    const passedCounts = count201 === 5 && count409 === 15;
    if (!passedCounts) {
      throw new Error(`Assertion failed: Expected exactly 5 successes (201) and 15 conflicts (409), got ${count201} 201s and ${count409} 409s.`);
    }

    // Fetch listing from DB and assert availableQuantity === 0 and status === 'sold_out'
    const finalListing = await Listing.findById(testListingId);
    if (!finalListing) {
      throw new Error('Test listing was unexpectedly deleted from DB');
    }

    console.log(`Final Listing state: availableQuantity = ${finalListing.availableQuantity}, status = '${finalListing.status}'`);

    if (finalListing.availableQuantity !== 0) {
      throw new Error(`Assertion failed: Expected availableQuantity === 0, got ${finalListing.availableQuantity}`);
    }

    if (finalListing.status !== 'sold_out') {
      throw new Error(`Assertion failed: Expected status === 'sold_out', got '${finalListing.status}'`);
    }

    // Verify reservation count in DB
    const reservationsCount = await Reservation.countDocuments({
      listingId: testListingId,
      status: 'reserved'
    });
    console.log(`Reservations confirmed in DB: ${reservationsCount}`);
    if (reservationsCount !== 5) {
      throw new Error(`Assertion failed: Expected 5 reservations in DB, got ${reservationsCount}`);
    }

    console.log('\nALL CONCURRENCY ASSERTIONS PASSED! No overselling occurred.');

    // Clean up test data
    await Reservation.deleteMany({ listingId: testListingId });
    await Listing.deleteOne({ _id: testListingId });
    console.log('Cleaned up concurrency test data.');

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('\nConcurrency test FAILED:', error.message);
    if (testListingId) {
      try {
        await Reservation.deleteMany({ listingId: testListingId });
        await Listing.deleteOne({ _id: testListingId });
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr.message);
      }
    }
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(1);
  }
};

runConcurrencyTest();
