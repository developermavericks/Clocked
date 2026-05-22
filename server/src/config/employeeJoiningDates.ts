import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(__dirname, '../../data/employee_joining_dates.json');

// Ensure directory exists
const dir = path.dirname(dataFilePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initial defaults
const DEFAULTS: Record<string, string> = {
  'aayushi.akhouri@themavericksindia.com': '2026-05-18'
};

function readData(): Record<string, string> {
  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(content);
      return { ...DEFAULTS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to read employee joining dates file:', err);
  }
  return { ...DEFAULTS };
}

function writeData(data: Record<string, string>) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write employee joining dates file:', err);
  }
}

export const getEmployeeJoiningDate = (identifier: string): string => {
  if (!identifier) return '2025-11-01';
  const clean = identifier.trim().toLowerCase();
  const data = readData();
  return data[clean] || '2025-11-01';
};

export const setEmployeeJoiningDate = (identifier: string, dateStr: string | null) => {
  if (!identifier) return;
  const clean = identifier.trim().toLowerCase();
  const data = readData();
  if (dateStr) {
    data[clean] = dateStr.substring(0, 10);
  } else {
    delete data[clean];
  }
  writeData(data);
};
