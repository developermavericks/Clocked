import { Router } from 'express';
import { getClients, createClient, getClientProjections, setClientProjection, updateClientProjection, deleteClientProjection, updateClientDates } from '../controllers/clientController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.patch('/:id/dates', authenticate, requireRole(['core']), updateClientDates);
router.get('/projections', getClientProjections);
router.post('/projections', authenticate, requireRole(['core']), setClientProjection);
router.put('/projections/:id', authenticate, requireRole(['core']), updateClientProjection);
router.delete('/projections/:id', authenticate, requireRole(['core']), deleteClientProjection);

export default router;
