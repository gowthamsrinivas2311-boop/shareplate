import { Router } from 'express';
import healthRoutes from './health.routes.js';
import reservationRoutes from './reservation.routes.js';
import listingRoutes from './listing.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/reservations', reservationRoutes);
router.use('/listings', listingRoutes);

export default router;
