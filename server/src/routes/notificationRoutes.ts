import { Router } from 'express';
import { sendIndividualReminder, sendAllReminders } from '../controllers/notificationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['manager', 'core']));

router.post('/remind', sendIndividualReminder);
router.post('/remind-all', sendAllReminders);

export default router;
