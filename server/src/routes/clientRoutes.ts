import { Router } from 'express';
import { getClients, createClient } from '../controllers/clientController';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.get('/projections', getClientProjections);
router.post('/projections', setClientProjection);

export default router;
