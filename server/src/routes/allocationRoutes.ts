import { Router } from 'express';
import { 
  getMyAllocations, 
  addMonthlyAllocation, 
  addWeeklyAllocation, 
  deleteAllocation, 
  updateAllocation, 
  exportMyAllocations,
  getUnlockedMonths,
  addUnlockedMonth,
  deleteUnlockedMonth,
  getWeeklyHoursForMonth
} from '../controllers/allocationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/my', getMyAllocations);
router.get('/my/export', exportMyAllocations);
router.get('/weekly-hours', getWeeklyHoursForMonth);
router.post('/monthly', addMonthlyAllocation);
router.post('/weekly', addWeeklyAllocation);

router.get('/unlocked-months', getUnlockedMonths);
router.post('/unlocked-months', addUnlockedMonth);
router.delete('/unlocked-months/:month', deleteUnlockedMonth);

router.delete('/:id', deleteAllocation);
router.put('/:id', updateAllocation);

export default router;
