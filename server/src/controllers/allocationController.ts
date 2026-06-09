import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { calculateWeekCode } from '../utils/dateUtils';
import { exportUserAllocationsToExcel } from '../services/excelService';
import { sendAcknowledgmentEmail } from '../services/emailService';

export const getMyAllocations = async (req: Request, res: Response) => {
  const { userId, month, kind } = req.query;

  if (!userId || !month) {
    return res.status(400).json({ error: 'Missing userId or month' });
  }

  try {
    let query;
    if (kind === 'projected') {
      query = supabase
        .from('allocations_monthly')
        .select('id, user_id, month, client_id, category, hours, notes, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('id, user_id, month, client_id, category, hours, notes, start_date, end_date, week_code, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month)
        .order('start_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkIfMonthLocked = async (month: string, userRole: string, userId?: string): Promise<boolean> => {
  // 1. Core users are NEVER locked out
  // Core users are subject to the same lock rules as others; they can unlock via unlocked_months table

  // Special lock override for Mitali Prakash (9582e5bb-f9f6-4a31-9888-4c5ffd4cc313) - all months unlocked
  if (userId === '9582e5bb-f9f6-4a31-9888-4c5ffd4cc313') {
    return false;
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  const [targetYear, targetMonth] = month.split('-').map(Number);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentDay = now.getDate();
  
  const diffMonths = (currentYear * 12 + currentMonth) - (targetYear * 12 + targetMonth);
  
  if (diffMonths <= 0) {
    // Current or future month: never locked
    return false;
  }
  
  if (diffMonths === 1) {
    // Immediate previous month: lock only if current day is 5 or later
    if (currentDay < 5) {
      return false;
    }
  }
  
  // 2. Older months (diffMonths > 1) or past-5th previous month: check if explicitly unlocked
  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .select('month')
      .eq('month', month)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[LOCK] "unlocked_months" table is missing in database. Please run the SQL schema in Supabase Dashboard SQL Editor.');
        return true;
      }
    }
    
    if (data && !error) {
      // Month is explicitly unlocked!
      return false;
    }
  } catch (err) {
    console.error('Error checking unlocked_months:', err);
  }

  return true;
};

const checkClientExitDate = async (client_id: string, dateOrMonth: string, isWeekly: boolean): Promise<string | null> => {
  if (!client_id) return null;
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('name, exit_date')
      .eq('id', client_id)
      .maybeSingle();

    if (error || !client || !client.exit_date) return null;

    const exitDateStr = client.exit_date;
    const clientName = client.name || 'this client';

    if (isWeekly) {
      if (dateOrMonth > exitDateStr) {
        return `Cannot log work for client "${clientName}". The client exited on ${exitDateStr}, but your entry date (${dateOrMonth}) is after the exit date.`;
      }
    } else {
      const exitMonth = exitDateStr.substring(0, 7);
      if (dateOrMonth > exitMonth) {
        return `Cannot log work for client "${clientName}". The client exited on ${exitDateStr}, and your target month (${dateOrMonth}) is after the exit month.`;
      }
    }
  } catch (err) {
    console.error('Error checking client exit date:', err);
  }
  return null;
};

export const addMonthlyAllocation = async (req: Request, res: Response) => {
  const { user_id, month, client_id, category, hours, notes } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    // Check lock
    const isLocked = await checkIfMonthLocked(month, userRole, user_id);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${month}) is locked for editing.` });
    }

    // Check client exit date constraint
    const exitErr = await checkClientExitDate(client_id, month, false);
    if (exitErr) {
      return res.status(400).json({ error: exitErr });
    }

    const { data, error } = await supabase
      .from('allocations_monthly')
      .insert([{ user_id, month, client_id, category, hours, notes }])
      .select();

    if (error) throw error;

    // Trigger acknowledgment email asynchronously (unless skipEmail is true)
    if (!req.body.skipEmail) {
      sendAcknowledgmentEmail(user_id, month).catch(err => {
        console.error('[EMAIL-ERROR] Failed to send acknowledgment email:', err);
      });
    }

    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addWeeklyAllocation = async (req: Request, res: Response) => {
  const { user_id, month: bodyMonth, client_id, category, hours, notes, start_date, end_date, source } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    // Determine the true month of the weekly allocation from start_date
    let month = bodyMonth;
    if (start_date && /^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      month = start_date.slice(0, 7); // YYYY-MM
    }

    // Debug log role and month
    console.log('[LOCK] Checking lock for month', month, 'role', userRole);
    // Check lock
    const isLocked = await checkIfMonthLocked(month, userRole, user_id);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${month}) is locked for editing.` });
    }

    // Check client exit date constraint
    if (start_date) {
      const exitErr = await checkClientExitDate(client_id, start_date, true);
      if (exitErr) {
        return res.status(400).json({ error: exitErr });
      }
    }
    if (end_date) {
      const exitErr = await checkClientExitDate(client_id, end_date, true);
      if (exitErr) {
        return res.status(400).json({ error: exitErr });
      }
    }

    // Helper to parse calendar tags from notes
    const parseCalTag = (notesStr: string) => {
      const match = notesStr.match(/\[cal:\s*(.*?)(?:\s*@\s*(.*?))?\s*\]/i);
      if (match) {
        return {
          title: match[1].toLowerCase().trim().replace(/\s+/g, ' '),
          timeRange: match[2] ? match[2].toLowerCase().trim().replace(/\s+/g, ' ') : null
        };
      }
      return null;
    };

    // Prevent duplicate entries for weekly allocations (unless force is true)
    if (!req.body.force) {
      const { data: duplicateCheck, error: dError } = await supabase
        .from('allocations_weekly')
        .select('id, notes, hours')
        .eq('user_id', user_id)
        .eq('start_date', start_date);

      if (dError) throw dError;

      if (duplicateCheck && duplicateCheck.length > 0) {
        const isDuplicate = duplicateCheck.some(alloc => {
          const hoursMatch = Math.abs(Number(alloc.hours) - Number(hours)) < 0.05;
          
          const allocTag = parseCalTag(alloc.notes || '');
          const incomingTag = parseCalTag(notes || '');

          if (allocTag && incomingTag) {
            // Both are calendar entries: match only if both title and time range (if present) are identical
            return allocTag.title === incomingTag.title && 
                   allocTag.timeRange === incomingTag.timeRange && 
                   hoursMatch;
          } else if (!allocTag && !incomingTag) {
            // Both are manual entries: match only if the notes are identical
            const cleanAllocNotes = (alloc.notes || '').toLowerCase().trim();
            const cleanIncomingNotes = (notes || '').toLowerCase().trim();
            return cleanAllocNotes === cleanIncomingNotes && hoursMatch;
          } else {
            // One calendar and one manual: never a duplicate
            return false;
          }
        });

        if (isDuplicate) {
          console.log(`[DUPLICATE] Prevented duplicate allocation insertion for user ${user_id} on ${start_date}`);
          return res.status(201).json(duplicateCheck[0]);
        }
      }
    }

    // Proceed with insertion, include source if provided
    const week_code = calculateWeekCode(month, start_date);
    const insertPayload: any = { user_id, month, client_id, category, hours, notes, start_date, end_date, week_code };
    if (source) insertPayload.source = source;
    const { data, error } = await supabase
      .from('allocations_weekly')
      .insert([insertPayload])
      .select();

    if (error) throw error;

    // Trigger acknowledgment email asynchronously (unless skipEmail is true)
    if (!req.body.skipEmail) {
      sendAcknowledgmentEmail(user_id, month).catch(err => {
        console.error('[EMAIL-ERROR] Failed to send acknowledgment email:', err);
      });
    }

    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



export const deleteAllocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kind } = req.query;
  const userRole = (req as any).user_role || 'team';

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
    
    // Fetch month first to verify lock
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('month, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !record) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    const isLocked = await checkIfMonthLocked(record.month, userRole, record.user_id);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${record.month}) is locked for editing.` });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAllocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kind, force, skipEmail, ...updates } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';

    // Fetch month first to verify lock
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !record) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    // 1. Check if the original month is locked
    const isOldLocked = await checkIfMonthLocked(record.month, userRole, record.user_id);
    if (isOldLocked) {
      return res.status(403).json({ error: `This month (${record.month}) is locked for editing.` });
    }

    // 2. Check if the target month is locked, and dynamically update week_code / month
    let targetMonth = record.month;
    if (kind === 'weekly') {
      const activeStartDate = updates.start_date || record.start_date;
      if (activeStartDate && /^\d{4}-\d{2}-\d{2}$/.test(activeStartDate)) {
        targetMonth = activeStartDate.slice(0, 7);
        updates.month = targetMonth;
        updates.week_code = calculateWeekCode(targetMonth, activeStartDate);
      }
    } else if (updates.month) {
      targetMonth = updates.month;
    }

    const isNewLocked = await checkIfMonthLocked(targetMonth, userRole, record.user_id);
    if (isNewLocked) {
      return res.status(403).json({ error: `The target month (${targetMonth}) is locked for editing.` });
    }

    // Check client exit date constraint
    const activeClientId = updates.client_id || record.client_id;
    if (activeClientId) {
      if (table === 'allocations_weekly') {
        const activeStartDate = updates.start_date || record.start_date;
        const activeEndDate = updates.end_date || record.end_date;
        if (activeStartDate) {
          const err = await checkClientExitDate(activeClientId, activeStartDate, true);
          if (err) return res.status(400).json({ error: err });
        }
        if (activeEndDate) {
          const err = await checkClientExitDate(activeClientId, activeEndDate, true);
          if (err) return res.status(400).json({ error: err });
        }
      } else {
        const activeMonth = updates.month || record.month;
        if (activeMonth) {
          const err = await checkClientExitDate(activeClientId, activeMonth, false);
          if (err) return res.status(400).json({ error: err });
        }
      }
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const exportMyAllocations = async (req: Request, res: Response) => {
  const { userId, month, kind } = req.query;

  if (!userId || !month) {
    return res.status(400).json({ error: 'Missing userId or month' });
  }

  try {
    let query;
    if (kind === 'projected') {
      query = supabase
        .from('allocations_monthly')
        .select('id, user_id, month, client_id, category, hours, notes, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('id, user_id, month, client_id, category, hours, notes, start_date, end_date, week_code, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    }

    const { data, error } = await query;
    if (error) throw error;

    const workbook = await exportUserAllocationsToExcel(userId as string, month as string, kind as any, data || []);
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=My_Allocations_${month}_${kind}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUnlockedMonths = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .select('*')
      .order('month', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[API] unlocked_months table is missing from Supabase database.');
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addUnlockedMonth = async (req: Request, res: Response) => {
  const { month } = req.body;
  const userRole = (req as any).user_role || 'team';

  if (userRole !== 'core') {
    return res.status(403).json({ error: 'Access denied: Core role required' });
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
  }

  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .upsert([{ month }])
      .select();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return res.status(400).json({ 
          error: 'The "unlocked_months" table is missing from the database. Please run the SQL schema in Supabase Dashboard SQL Editor first.' 
        });
      }
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUnlockedMonth = async (req: Request, res: Response) => {
  const { month } = req.params;
  const userRole = (req as any).user_role || 'team';

  if (userRole !== 'core') {
    return res.status(403).json({ error: 'Access denied: Core role required' });
  }

  try {
    const { error } = await supabase
      .from('unlocked_months')
      .delete()
      .eq('month', month);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return res.status(400).json({ 
          error: 'The "unlocked_months" table is missing from the database. Please run the SQL schema in Supabase Dashboard SQL Editor first.' 
        });
      }
      throw error;
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
