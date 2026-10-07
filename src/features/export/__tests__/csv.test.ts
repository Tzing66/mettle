import { csvEscape, SET_COLUMNS, setsToCsv, type ExportSet } from '../csv';

const base: ExportSet = {
  workoutId: 'w1',
  workoutStartedAt: new Date(Date.UTC(2026, 9, 7, 17)),
  workoutEndedAt: new Date(Date.UTC(2026, 9, 7, 18)),
  exerciseName: 'Bench press',
  category: 'free_weight',
  setNumber: 1,
  isWarmup: false,
  weightKg: 100,
  reps: 5,
  durationS: null,
  distanceM: null,
  completedAt: new Date(Date.UTC(2026, 9, 7, 17, 20)),
};

describe('CSV export', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape("Farmer's walk, heavy")).toBe('"Farmer\'s walk, heavy"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape(null)).toBe('');
  });

  it('writes a header and one row per set in stored units', () => {
    const lines = setsToCsv([base]).trim().split('\n');
    expect(lines[0]).toBe(SET_COLUMNS.join(','));
    expect(lines[1]).toBe(
      'w1,2026-10-07T17:00:00.000Z,2026-10-07T18:00:00.000Z,Bench press,free_weight,1,false,100,5,,,116.7,2026-10-07T17:20:00.000Z',
    );
  });

  it('leaves e1RM empty for warm-ups and non-lifts', () => {
    const csv = setsToCsv([
      { ...base, isWarmup: true },
      { ...base, exerciseName: 'Run', category: 'cardio', weightKg: null, reps: null, durationS: 1500, distanceM: 5000 },
    ]);
    const [, warm, run] = csv.trim().split('\n');
    expect(warm.split(',')[11]).toBe('');
    expect(run.split(',')[11]).toBe('');
    expect(run).toContain(',1500,5000,');
  });
});
