import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getClients = async (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    let filtered = data;
    if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      // Fetch monthly budget overrides for this month
      let monthlyBudgets: any[] = [];
      try {
        const { data: mbData, error: mbErr } = await supabase
          .from('monthly_budgets')
          .select('*')
          .eq('month', month);
        if (!mbErr && mbData) {
          monthlyBudgets = mbData;
        }
      } catch (err) {
        console.warn('Could not query monthly_budgets in getClients:', err);
      }

      filtered = data
        .filter((c: any) => {
          // Handle join date constraint
          const joinMonth = c.joining_date ? c.joining_date.substring(0, 7) : '2025-11';
          if (joinMonth > month) return false;

          // Handle exit date constraint
          if (c.exit_date) {
            const exitMonth = c.exit_date.substring(0, 7);
            if (exitMonth < month) return false;
          }

          return true;
        })
        .map((c: any) => {
          const override = monthlyBudgets.find((b: any) => b.client_id === c.id);
          return {
            ...c,
            budget: override ? Number(override.budget) : (c.budget !== undefined ? Number(c.budget) : 0)
          };
        });
    }

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  const name = req.body.name?.trim();
  const joiningDate = req.body.joiningDate || '2025-11-01';

  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, joining_date: joiningDate }])
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        // Fetch the existing client to return it
        const { data: existing } = await supabase
          .from('clients')
          .select('*')
          .eq('name', name)
          .single();
        
        if (existing) {
          return res.status(200).json(existing); // Return existing instead of error
        }
      }
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClientDates = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { joiningDate, exitDate } = req.body;

  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        joining_date: joiningDate === undefined ? undefined : joiningDate,
        exit_date: exitDate === undefined ? undefined : (exitDate === '' ? null : exitDate)
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const setClientProjection = async (req: any, res: Response) => {
  const { id, client_id, month, target_hours } = req.body;
  const created_by = req.user?.id;

  if (!client_id || !month || target_hours === undefined) {
    return res.status(400).json({ error: 'Missing client_id, month, or target_hours' });
  }

  try {
    let result;
    
    // 1. If we have an ID, update specifically
    if (id) {
      const { data, error } = await supabase
        .from('client_projections')
        .update({ target_hours, created_by })
        .eq('id', id)
        .select();
      if (error) throw error;
      result = data[0];
    } 
    // 2. Otherwise, try to find an existing one for this client/month
    else {
      const { data: existing } = await supabase
        .from('client_projections')
        .select('id')
        .eq('client_id', client_id)
        .eq('month', month)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('client_projections')
          .update({ target_hours, created_by })
          .eq('id', existing.id)
          .select();
        if (error) throw error;
        result = data[0];
      } else {
        // 3. Completely new entry
        const { data, error } = await supabase
          .from('client_projections')
          .insert([{ client_id, month, target_hours, created_by }])
          .select();
        if (error) throw error;
        result = data[0];
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error('Projection Save Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getClientProjections = async (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    // 1. Get projections with client name and creator name
    let query = supabase
      .from('client_projections')
      .select('*, clients(name), creator:users!created_by(name)');
    
    if (month) {
      query = query.eq('month', month);
    }

    const { data: projections, error } = await query.order('month', { ascending: false });

    if (error) throw error;

    // 2. Get actual hours summarized by client and month
    const { data: actuals, error: actualsError } = await supabase
      .from('allocations_weekly')
      .select('client_id, month, hours');

    if (actualsError) throw actualsError;

    // 3. Merge them
    const merged = projections.map(p => {
      const actualHours = (actuals || [])
        .filter(a => a.client_id === p.client_id && a.month === p.month)
        .reduce((sum, curr) => sum + (Number(curr.hours) || 0), 0);
      
      return {
        ...p,
        actual_hours: actualHours
      };
    });

    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClientProjection = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('client_projections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClientProjection = async (req: any, res: Response) => {
  const { id } = req.params;
  const { target_hours } = req.body;
  const created_by = req.user?.id;

  try {
    const { data, error } = await supabase
      .from('client_projections')
      .update({ target_hours, created_by })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
