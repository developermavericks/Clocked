import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getClients = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  const name = req.body.name?.trim();

  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name }])
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
