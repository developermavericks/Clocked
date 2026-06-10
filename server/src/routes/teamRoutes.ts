import { Router } from 'express';
import { getTeamMembers, getMemberAllocations, getAllUsers, deleteUser, updateUserRole, updateUserExitDate, updateUserJoiningDate, createUser } from '../controllers/teamController';
import { authenticate, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

router.use(authenticate);

router.get('/members', requireRole(['manager', 'core']), getTeamMembers);
router.get('/allocations', requireRole(['manager', 'core']), getMemberAllocations);
router.get('/all', requireRole(['core']), getAllUsers);

router.get('/me', async (req, res) => {
  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', (req as any).user.id)
      .single();

    if (error || !dbUser) {
      return res.json({ role: (req as any).user_role || 'team' });
    }
    res.json(dbUser);
  } catch (err) {
    res.json({ role: (req as any).user_role || 'team' });
  }
});

router.delete('/users/:id', requireRole(['core']), deleteUser);
router.patch('/users/:id/role', requireRole(['core']), updateUserRole);
router.patch('/users/:id/exit-date', requireRole(['core']), updateUserExitDate);
router.patch('/users/:id/joining-date', requireRole(['core']), updateUserJoiningDate);
router.post('/users', requireRole(['core']), createUser);

export default router;

