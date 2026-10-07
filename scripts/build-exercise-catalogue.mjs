// Builds config/exercises.json from free-exercise-db (Unlicense / public domain)
// plus a few Mettle-authored entries the dataset lacks (outdoor run, swim, burpee).
//
//   node scripts/build-exercise-catalogue.mjs
//
// The curation table below is the source of truth: our id, the dataset id (or null),
// display name, short code for the tile, category, tracking type and extras.

import { writeFileSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// [id, datasetId, name, short, category, trackingType, extras]
const W = 'weight_reps';
const R = 'reps';
const T = 'time';
const D = 'distance_time';

const CATALOGUE = [
  // Free weights
  ['bench_press', 'Barbell_Bench_Press_-_Medium_Grip', 'Bench press', 'BP', 'free_weight', W, { benchmarkId: 'bench_press' }],
  ['incline_bench_press', 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'Incline bench press', 'IBP', 'free_weight', W],
  ['close_grip_bench_press', 'Close-Grip_Barbell_Bench_Press', 'Close-grip bench press', 'CGB', 'free_weight', W],
  ['db_bench_press', 'Dumbbell_Bench_Press', 'Dumbbell bench press', 'DBP', 'free_weight', W],
  ['incline_db_press', 'Incline_Dumbbell_Press', 'Incline dumbbell press', 'IDP', 'free_weight', W],
  ['db_fly', 'Dumbbell_Flyes', 'Dumbbell fly', 'DF', 'free_weight', W],
  ['back_squat', 'Barbell_Full_Squat', 'Back squat', 'SQ', 'free_weight', W, { benchmarkId: 'back_squat' }],
  ['front_squat', 'Front_Barbell_Squat', 'Front squat', 'FS', 'free_weight', W],
  ['goblet_squat', 'Goblet_Squat', 'Goblet squat', 'GS', 'free_weight', W],
  ['deadlift', 'Barbell_Deadlift', 'Deadlift', 'DL', 'free_weight', W, { benchmarkId: 'deadlift' }],
  ['romanian_deadlift', 'Romanian_Deadlift', 'Romanian deadlift', 'RDL', 'free_weight', W],
  ['sumo_deadlift', 'Sumo_Deadlift', 'Sumo deadlift', 'SDL', 'free_weight', W],
  ['trap_bar_deadlift', 'Trap_Bar_Deadlift', 'Trap bar deadlift', 'TBD', 'free_weight', W],
  ['hip_thrust', 'Barbell_Hip_Thrust', 'Hip thrust', 'HT', 'free_weight', W],
  ['glute_bridge', 'Barbell_Glute_Bridge', 'Barbell glute bridge', 'GB', 'free_weight', W],
  ['good_morning', 'Good_Morning', 'Good morning', 'GM', 'free_weight', W],
  ['overhead_press', 'Standing_Military_Press', 'Overhead press', 'OHP', 'free_weight', W],
  ['db_shoulder_press', 'Dumbbell_Shoulder_Press', 'Dumbbell shoulder press', 'DSP', 'free_weight', W],
  ['arnold_press', 'Arnold_Dumbbell_Press', 'Arnold press', 'AP', 'free_weight', W],
  ['lateral_raise', 'Side_Lateral_Raise', 'Lateral raise', 'LR', 'free_weight', W],
  ['rear_delt_fly', 'Reverse_Flyes', 'Rear delt fly', 'RDF', 'free_weight', W],
  ['upright_row', 'Upright_Barbell_Row', 'Upright row', 'UR', 'free_weight', W],
  ['barbell_row', 'Bent_Over_Barbell_Row', 'Barbell row', 'BR', 'free_weight', W],
  ['db_row', 'One-Arm_Dumbbell_Row', 'Dumbbell row', 'DR', 'free_weight', W],
  ['t_bar_row', 'T-Bar_Row_with_Handle', 'T-bar row', 'TBR', 'free_weight', W],
  ['barbell_shrug', 'Barbell_Shrug', 'Barbell shrug', 'SH', 'free_weight', W],
  ['db_shrug', 'Dumbbell_Shrug', 'Dumbbell shrug', 'DSH', 'free_weight', W],
  ['barbell_curl', 'Barbell_Curl', 'Barbell curl', 'BC', 'free_weight', W],
  ['db_curl', 'Dumbbell_Bicep_Curl', 'Dumbbell curl', 'DC', 'free_weight', W],
  ['hammer_curl', 'Hammer_Curls', 'Hammer curl', 'HC', 'free_weight', W],
  ['preacher_curl', 'Preacher_Curl', 'Preacher curl', 'PC', 'free_weight', W],
  ['skullcrusher', 'EZ-Bar_Skullcrusher', 'Skullcrusher', 'SC', 'free_weight', W],
  ['db_triceps_extension', 'Standing_Dumbbell_Triceps_Extension', 'Overhead triceps extension', 'OTE', 'free_weight', W],
  ['triceps_kickback', 'Tricep_Dumbbell_Kickback', 'Triceps kickback', 'TK', 'free_weight', W],
  ['db_lunge', 'Dumbbell_Lunges', 'Dumbbell lunge', 'LU', 'free_weight', W],
  ['barbell_lunge', 'Barbell_Lunge', 'Barbell lunge', 'BL', 'free_weight', W],
  ['split_squat', 'Split_Squat_with_Dumbbells', 'Split squat', 'SS', 'free_weight', W],
  ['step_up', 'Dumbbell_Step_Ups', 'Step-up', 'SU', 'free_weight', W],
  ['kettlebell_swing', 'One-Arm_Kettlebell_Swings', 'Kettlebell swing', 'KS', 'free_weight', W],
  ['farmers_walk', 'Farmers_Walk', "Farmer's walk", 'FW', 'free_weight', W],
  ['power_clean', 'Power_Clean', 'Power clean', 'PCL', 'free_weight', W],

  // Machines & cables
  ['leg_press', 'Leg_Press', 'Leg press', 'LP', 'machine', W],
  ['hack_squat', 'Hack_Squat', 'Hack squat', 'HS', 'machine', W],
  ['smith_squat', 'Smith_Machine_Squat', 'Smith machine squat', 'SMS', 'machine', W],
  ['leg_extension', 'Leg_Extensions', 'Leg extension', 'LE', 'machine', W],
  ['lying_leg_curl', 'Lying_Leg_Curls', 'Lying leg curl', 'LLC', 'machine', W],
  ['seated_leg_curl', 'Seated_Leg_Curl', 'Seated leg curl', 'SLC', 'machine', W],
  ['standing_calf_raise', 'Standing_Calf_Raises', 'Standing calf raise', 'CR', 'machine', W],
  ['seated_calf_raise', 'Seated_Calf_Raise', 'Seated calf raise', 'SCR', 'machine', W],
  ['hip_abduction', 'Thigh_Abductor', 'Hip abduction', 'HAB', 'machine', W],
  ['hip_adduction', 'Thigh_Adductor', 'Hip adduction', 'HAD', 'machine', W],
  ['lat_pulldown', 'Wide-Grip_Lat_Pulldown', 'Lat pulldown', 'LPD', 'machine', W],
  ['close_grip_pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Close-grip pulldown', 'CPD', 'machine', W],
  ['straight_arm_pulldown', 'Straight-Arm_Pulldown', 'Straight-arm pulldown', 'SAP', 'machine', W],
  ['seated_cable_row', 'Seated_Cable_Rows', 'Seated cable row', 'CRW', 'machine', W],
  ['face_pull', 'Face_Pull', 'Face pull', 'FP', 'machine', W],
  ['machine_chest_press', 'Leverage_Chest_Press', 'Machine chest press', 'MCP', 'machine', W],
  ['pec_deck', 'Butterfly', 'Pec deck', 'PD', 'machine', W],
  ['cable_crossover', 'Cable_Crossover', 'Cable crossover', 'CC', 'machine', W],
  ['machine_shoulder_press', 'Machine_Shoulder_Military_Press', 'Machine shoulder press', 'MSP', 'machine', W],
  ['cable_lateral_raise', 'Cable_Seated_Lateral_Raise', 'Cable lateral raise', 'CLR', 'machine', W],
  ['triceps_pushdown', 'Triceps_Pushdown', 'Triceps pushdown', 'TP', 'machine', W],
  ['rope_hammer_curl', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Rope hammer curl', 'RHC', 'machine', W],
  ['cable_crunch', 'Cable_Crunch', 'Cable crunch', 'CCR', 'machine', W],
  ['pallof_press', 'Pallof_Press', 'Pallof press', 'PP', 'machine', W],

  // Bodyweight
  ['push_up', 'Pushups', 'Push-up', 'PU', 'bodyweight', R, { benchmarkId: 'push_ups' }],
  ['pull_up', 'Pullups', 'Pull-up', 'PL', 'bodyweight', R],
  ['chin_up', 'Chin-Up', 'Chin-up', 'CU', 'bodyweight', R],
  ['dip', 'Dips_-_Triceps_Version', 'Dip', 'DP', 'bodyweight', R],
  ['inverted_row', 'Inverted_Row', 'Inverted row', 'IR', 'bodyweight', R],
  ['bodyweight_squat', 'Bodyweight_Squat', 'Air squat', 'AS', 'bodyweight', R],
  ['plank', 'Plank', 'Plank', 'PK', 'bodyweight', T],
  ['side_plank', 'Side_Bridge', 'Side plank', 'SPK', 'bodyweight', T],
  ['crunch', 'Crunches', 'Crunch', 'CN', 'bodyweight', R],
  ['sit_up', 'Sit-Up', 'Sit-up', 'SIT', 'bodyweight', R],
  ['hanging_leg_raise', 'Hanging_Leg_Raise', 'Hanging leg raise', 'HLR', 'bodyweight', R],
  ['russian_twist', 'Russian_Twist', 'Russian twist', 'RT', 'bodyweight', R],
  ['ab_wheel', 'Ab_Roller', 'Ab wheel', 'AW', 'bodyweight', R],
  ['mountain_climber', 'Mountain_Climbers', 'Mountain climber', 'MC', 'bodyweight', R],
  ['back_extension', 'Hyperextensions_Back_Extensions', 'Back extension', 'BE', 'bodyweight', R],
  ['box_jump', 'Box_Jump_Multiple_Response', 'Box jump', 'BJ', 'bodyweight', R],
  ['burpee', null, 'Burpee', 'BU', 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['quadriceps', 'chest', 'shoulders'] }],

  // Cardio
  ['outdoor_run', null, 'Run', 'RUN', 'cardio', D, { activity: 'run', benchmarkId: 'run_5k', equipment: 'none', primaryMuscles: ['quadriceps', 'hamstrings', 'calves'] }],
  ['treadmill_run', 'Running_Treadmill', 'Treadmill run', 'TRM', 'cardio', D, { activity: 'run', benchmarkId: 'run_5k' }],
  ['walk', 'Walking_Treadmill', 'Walk', 'WLK', 'cardio', D, { activity: 'walk' }],
  ['hike', 'Trail_Running_Walking', 'Hike', 'HK', 'cardio', D, { activity: 'hike' }],
  ['outdoor_cycle', 'Bicycling', 'Ride', 'RD', 'cardio', D, { activity: 'cycle' }],
  ['stationary_bike', 'Bicycling_Stationary', 'Stationary bike', 'BK', 'cardio', D, { activity: 'cycle' }],
  ['rowing_machine', 'Rowing_Stationary', 'Rowing machine', 'ROW', 'cardio', D, { activity: 'row' }],
  ['swim', null, 'Swim', 'SWM', 'cardio', D, { activity: 'swim', equipment: 'pool', primaryMuscles: ['lats', 'shoulders'] }],
  ['elliptical', 'Elliptical_Trainer', 'Elliptical', 'EL', 'cardio', T, { activity: 'elliptical' }],
  ['stair_climber', 'Stairmaster', 'Stair climber', 'STR', 'cardio', T, { activity: 'stairs' }],
  ['jump_rope', 'Rope_Jumping', 'Jump rope', 'JR', 'cardio', T, { activity: 'jump_rope' }],
];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const dataset = new Map((await res.json()).map((e) => [e.id, e]));

const seen = new Set();
const exercises = CATALOGUE.map(([id, datasetId, name, short, category, trackingType, extras = {}]) => {
  if (seen.has(id)) throw new Error(`Duplicate id ${id}`);
  seen.add(id);
  const src = datasetId ? dataset.get(datasetId) : null;
  if (datasetId && !src) throw new Error(`Dataset id not found: ${datasetId}`);
  return {
    id,
    name,
    short,
    category,
    trackingType,
    equipment: extras.equipment ?? src?.equipment ?? null,
    primaryMuscles: extras.primaryMuscles ?? src?.primaryMuscles ?? [],
    ...(extras.activity ? { activity: extras.activity } : {}),
    ...(extras.benchmarkId ? { benchmarkId: extras.benchmarkId } : {}),
    source: datasetId ? `free-exercise-db:${datasetId}` : 'mettle',
  };
});

writeFileSync(
  new URL('../config/exercises.json', import.meta.url),
  JSON.stringify({ version: 'exercises.v1', exercises }, null, 2) + '\n',
);
console.log(`Wrote ${exercises.length} exercises`);
