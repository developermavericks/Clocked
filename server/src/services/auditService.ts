import { supabase } from '../config/supabase';

export const logActivity = async (
  action: string,
  performedBy: string,
  targetUserId: string | null,
  details: any = {}
) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        action,
        performed_by: performedBy.toLowerCase().trim(),
        target_user_id: targetUserId || null,
        details
      }]);

    if (error) {
      console.error('[AUDIT-LOG-ERROR] Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('[AUDIT-LOG-ERROR] Error executing logActivity:', err);
  }
};
