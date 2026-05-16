import { Router } from 'express';
import { getClients, createClient, getClientProjections, setClientProjection, updateClientProjection, deleteClientProjection } from '../controllers/clientController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.get('/projections', getClientProjections);
router.post('/projections', authenticate, requireRole(['core']), setClientProjection);
router.put('/projections/:id', authenticate, requireRole(['core']), updateClientProjection);
router.delete('/projections/:id', authenticate, requireRole(['core']), deleteClientProjection);

export default router;
