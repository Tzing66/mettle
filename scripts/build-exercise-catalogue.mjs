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
  ['overhead_press', 'Standing_Military_Press', 'Overhead press', 'OHP', 'free_weight', W, { benchmarkId: 'overhead_press' }],
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
  ['pull_up', 'Pullups', 'Pull-up', 'PL', 'bodyweight', R, { benchmarkId: 'pull_ups' }],
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
  ['outdoor_run', null, 'Run', 'RUN', 'cardio', D, { activity: 'run', benchmarkId: 'run', equipment: 'none', primaryMuscles: ['quadriceps', 'hamstrings', 'calves'] }],
  ['treadmill_run', 'Running_Treadmill', 'Treadmill run', 'TRM', 'cardio', D, { activity: 'run', benchmarkId: 'run' }],
  ['walk', 'Walking_Treadmill', 'Walk', 'WLK', 'cardio', D, { activity: 'walk' }],
  ['hike', 'Trail_Running_Walking', 'Hike', 'HK', 'cardio', D, { activity: 'hike' }],
  ['outdoor_cycle', 'Bicycling', 'Ride', 'RD', 'cardio', D, { activity: 'cycle' }],
  ['stationary_bike', 'Bicycling_Stationary', 'Stationary bike', 'BK', 'cardio', D, { activity: 'cycle' }],
  ['rowing_machine', 'Rowing_Stationary', 'Rowing machine', 'ROW', 'cardio', D, { activity: 'row' }],
  ['swim', null, 'Swim', 'SWM', 'cardio', D, { activity: 'swim', equipment: 'pool', primaryMuscles: ['lats', 'shoulders'] }],
  ['elliptical', 'Elliptical_Trainer', 'Elliptical', 'EL', 'cardio', T, { activity: 'elliptical' }],
  ['stair_climber', 'Stairmaster', 'Stair climber', 'STR', 'cardio', T, { activity: 'stairs' }],
  ['jump_rope', 'Rope_Jumping', 'Jump rope', 'JR', 'cardio', T, { activity: 'jump_rope' }],
  // ——— v2 additions (codes auto-generated when null) ———
  // Free weights: chest & shoulders
  ['wide_grip_bench_press', 'Wide-Grip_Barbell_Bench_Press', 'Wide-grip bench press', null, 'free_weight', W],
  ['decline_bench_press', 'Decline_Barbell_Bench_Press', 'Decline bench press', null, 'free_weight', W],
  ['floor_press', 'Floor_Press', 'Floor press', null, 'free_weight', W],
  ['decline_db_press', 'Decline_Dumbbell_Bench_Press', 'Decline dumbbell press', null, 'free_weight', W],
  ['neutral_grip_db_press', 'Dumbbell_Bench_Press_with_Neutral_Grip', 'Neutral-grip dumbbell press', null, 'free_weight', W],
  ['incline_db_fly', 'Incline_Dumbbell_Flyes', 'Incline dumbbell fly', null, 'free_weight', W],
  ['db_pullover', 'Straight-Arm_Dumbbell_Pullover', 'Dumbbell pullover', null, 'free_weight', W],
  ['seated_db_press', 'Seated_Dumbbell_Press', 'Seated dumbbell press', null, 'free_weight', W],
  ['seated_barbell_press', 'Seated_Barbell_Military_Press', 'Seated barbell press', null, 'free_weight', W],
  ['front_raise', 'Front_Dumbbell_Raise', 'Front raise', null, 'free_weight', W],
  ['db_upright_row', 'Standing_Dumbbell_Upright_Row', 'Dumbbell upright row', null, 'free_weight', W],
  ['landmine_press', null, 'Landmine press', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['shoulders', 'chest'] }],
  ['push_press', null, 'Push press', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['shoulders', 'triceps'] }],
  // Free weights: legs & hinge
  ['box_squat', 'Box_Squat', 'Box squat', null, 'free_weight', W],
  ['pause_squat', null, 'Pause squat', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['quadriceps', 'glutes'] }],
  ['db_squat', 'Dumbbell_Squat', 'Dumbbell squat', null, 'free_weight', W],
  ['sumo_squat', 'Plie_Dumbbell_Squat', 'Sumo squat', null, 'free_weight', W],
  ['bulgarian_split_squat', null, 'Bulgarian split squat', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['quadriceps', 'glutes'] }],
  ['walking_lunge', 'Barbell_Walking_Lunge', 'Walking lunge', null, 'free_weight', W],
  ['reverse_lunge', 'Dumbbell_Rear_Lunge', 'Reverse lunge', null, 'free_weight', W],
  ['barbell_step_up', 'Barbell_Step_Ups', 'Barbell step-up', null, 'free_weight', W],
  ['stiff_leg_deadlift', 'Stiff-Legged_Barbell_Deadlift', 'Stiff-leg deadlift', null, 'free_weight', W],
  ['db_romanian_deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Dumbbell Romanian deadlift', null, 'free_weight', W],
  ['single_leg_rdl', 'Kettlebell_One-Legged_Deadlift', 'Single-leg Romanian deadlift', null, 'free_weight', W],
  ['deficit_deadlift', 'Deficit_Deadlift', 'Deficit deadlift', null, 'free_weight', W],
  ['rack_pull', 'Rack_Pulls', 'Rack pull', null, 'free_weight', W],
  ['standing_db_calf_raise', 'Standing_Dumbbell_Calf_Raise', 'Dumbbell calf raise', null, 'free_weight', W],
  // Free weights: back
  ['pendlay_row', null, 'Pendlay row', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['middle back', 'lats'] }],
  ['underhand_row', 'Reverse_Grip_Bent-Over_Rows', 'Underhand barbell row', null, 'free_weight', W],
  ['chest_supported_row', 'Dumbbell_Incline_Row', 'Chest-supported dumbbell row', null, 'free_weight', W],
  ['two_db_row', 'Bent_Over_Two-Dumbbell_Row', 'Bent-over dumbbell row', null, 'free_weight', W],
  ['landmine_row', 'Bent_Over_Two-Arm_Long_Bar_Row', 'Landmine row', null, 'free_weight', W],
  // Free weights: arms
  ['ez_bar_curl', 'EZ-Bar_Curl', 'EZ-bar curl', null, 'free_weight', W],
  ['incline_db_curl', 'Incline_Dumbbell_Curl', 'Incline dumbbell curl', null, 'free_weight', W],
  ['concentration_curl', 'Concentration_Curls', 'Concentration curl', null, 'free_weight', W],
  ['spider_curl', 'Spider_Curl', 'Spider curl', null, 'free_weight', W],
  ['reverse_curl', 'Reverse_Barbell_Curl', 'Reverse curl', null, 'free_weight', W],
  ['zottman_curl', 'Zottman_Curl', 'Zottman curl', null, 'free_weight', W],
  ['wrist_curl', 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', 'Wrist curl', null, 'free_weight', W],
  ['jm_press', 'JM_Press', 'JM press', null, 'free_weight', W],
  ['lying_db_triceps_extension', 'Lying_Dumbbell_Tricep_Extension', 'Lying dumbbell triceps extension', null, 'free_weight', W],
  // Kettlebell & Olympic
  ['kettlebell_press', 'Two-Arm_Kettlebell_Military_Press', 'Kettlebell press', null, 'free_weight', W],
  ['kettlebell_row', 'One-Arm_Kettlebell_Row', 'Kettlebell row', null, 'free_weight', W],
  ['kettlebell_clean', 'One-Arm_Kettlebell_Clean', 'Kettlebell clean', null, 'free_weight', W],
  ['kettlebell_thruster', 'Kettlebell_Thruster', 'Kettlebell thruster', null, 'free_weight', W],
  ['turkish_get_up', 'Kettlebell_Turkish_Get-Up_Squat_style', 'Turkish get-up', null, 'free_weight', W],
  ['kettlebell_windmill', 'Kettlebell_Windmill', 'Kettlebell windmill', null, 'free_weight', W],
  ['hang_clean', 'Hang_Clean', 'Hang clean', null, 'free_weight', W],
  ['clean_and_press', 'Clean_and_Press', 'Clean and press', null, 'free_weight', W],
  ['snatch', 'Snatch', 'Snatch', null, 'free_weight', W],
  ['db_side_bend', 'Dumbbell_Side_Bend', 'Dumbbell side bend', null, 'free_weight', W],
  ['landmine_rotation', 'Landmine_180s', 'Landmine rotation', null, 'free_weight', W],

  // Machines & cables
  ['smith_bench_press', 'Smith_Machine_Bench_Press', 'Smith machine bench press', null, 'machine', W],
  ['smith_incline_press', 'Smith_Machine_Incline_Bench_Press', 'Smith machine incline press', null, 'machine', W],
  ['smith_shoulder_press', 'Smith_Machine_Overhead_Shoulder_Press', 'Smith machine shoulder press', null, 'machine', W],
  ['smith_rdl', 'Smith_Machine_Stiff-Legged_Deadlift', 'Smith machine Romanian deadlift', null, 'machine', W],
  ['smith_split_squat', 'Smith_Single-Leg_Split_Squat', 'Smith machine split squat', null, 'machine', W],
  ['incline_machine_press', 'Leverage_Incline_Chest_Press', 'Incline machine press', null, 'machine', W],
  ['machine_row', 'Leverage_Iso_Row', 'Machine row', null, 'machine', W],
  ['machine_high_row', 'Leverage_High_Row', 'Machine high row', null, 'machine', W],
  ['chest_supported_t_bar_row', 'Lying_T-Bar_Row', 'Chest-supported T-bar row', null, 'machine', W],
  ['reverse_pec_deck', 'Reverse_Machine_Flyes', 'Reverse pec deck', null, 'machine', W],
  ['machine_bicep_curl', 'Machine_Bicep_Curl', 'Machine biceps curl', null, 'machine', W],
  ['machine_preacher_curl', 'Machine_Preacher_Curls', 'Machine preacher curl', null, 'machine', W],
  ['machine_triceps_extension', 'Machine_Triceps_Extension', 'Machine triceps extension', null, 'machine', W],
  ['assisted_dip_machine', 'Dip_Machine', 'Dip machine', null, 'machine', W],
  ['ab_crunch_machine', 'Ab_Crunch_Machine', 'Ab crunch machine', null, 'machine', W],
  ['standing_leg_curl', 'Standing_Leg_Curl', 'Standing leg curl', null, 'machine', W],
  ['leg_press_calf_raise', 'Calf_Press_On_The_Leg_Press_Machine', 'Leg press calf raise', null, 'machine', W],
  ['glute_ham_raise', 'Glute_Ham_Raise', 'Glute-ham raise', null, 'machine', W],
  ['reverse_hyper', 'Reverse_Hyperextension', 'Reverse hyper', null, 'machine', W],
  ['cable_fly', 'Flat_Bench_Cable_Flyes', 'Cable fly', null, 'machine', W],
  ['incline_cable_fly', 'Incline_Cable_Flye', 'Incline cable fly', null, 'machine', W],
  ['low_cable_crossover', 'Low_Cable_Crossover', 'Low-to-high cable fly', null, 'machine', W],
  ['cable_chest_press', 'Standing_Cable_Chest_Press', 'Cable chest press', null, 'machine', W],
  ['cable_curl', 'Standing_Biceps_Cable_Curl', 'Cable curl', null, 'machine', W],
  ['overhead_cable_curl', 'Overhead_Cable_Curl', 'Overhead cable curl', null, 'machine', W],
  ['cable_overhead_triceps_extension', 'Cable_Rope_Overhead_Triceps_Extension', 'Overhead cable triceps extension', null, 'machine', W],
  ['rope_pushdown', 'Triceps_Pushdown_-_Rope_Attachment', 'Rope pushdown', null, 'machine', W],
  ['reverse_grip_pushdown', 'Reverse_Grip_Triceps_Pushdown', 'Reverse-grip pushdown', null, 'machine', W],
  ['single_arm_cable_row', 'Seated_One-arm_Cable_Pulley_Rows', 'Single-arm cable row', null, 'machine', W],
  ['single_arm_pulldown', 'One_Arm_Lat_Pulldown', 'Single-arm pulldown', null, 'machine', W],
  ['underhand_pulldown', 'Underhand_Cable_Pulldowns', 'Underhand pulldown', null, 'machine', W],
  ['cable_rear_delt_fly', 'Cable_Rear_Delt_Fly', 'Cable rear delt fly', null, 'machine', W],
  ['cable_front_raise', 'Front_Cable_Raise', 'Cable front raise', null, 'machine', W],
  ['cable_upright_row', 'Upright_Cable_Row', 'Cable upright row', null, 'machine', W],
  ['cable_shrug', 'Cable_Shrugs', 'Cable shrug', null, 'machine', W],
  ['cable_external_rotation', 'External_Rotation_with_Cable', 'Cable external rotation', null, 'machine', W],
  ['cable_kickback', 'One-Legged_Cable_Kickback', 'Cable glute kickback', null, 'machine', W],
  ['cable_pull_through', 'Pull_Through', 'Cable pull-through', null, 'machine', W],
  ['cable_woodchop', 'Standing_Cable_Wood_Chop', 'Cable woodchop', null, 'machine', W],
  ['cable_hip_adduction', 'Cable_Hip_Adduction', 'Cable hip adduction', null, 'machine', W],

  // Bodyweight
  ['wide_push_up', 'Push-Up_Wide', 'Wide push-up', null, 'bodyweight', R],
  ['diamond_push_up', 'Push-Ups_-_Close_Triceps_Position', 'Diamond push-up', null, 'bodyweight', R],
  ['decline_push_up', 'Push-Ups_With_Feet_Elevated', 'Decline push-up', null, 'bodyweight', R],
  ['incline_push_up', 'Incline_Push-Up', 'Incline push-up', null, 'bodyweight', R],
  ['plyo_push_up', 'Plyo_Push-up', 'Plyometric push-up', null, 'bodyweight', R],
  ['bench_dip', 'Bench_Dips', 'Bench dip', null, 'bodyweight', R],
  ['ring_dip', 'Ring_Dips', 'Ring dip', null, 'bodyweight', R],
  ['assisted_pull_up', 'Band_Assisted_Pull-Up', 'Band-assisted pull-up', null, 'bodyweight', R],
  ['weighted_pull_up', 'Weighted_Pull_Ups', 'Weighted pull-up', null, 'bodyweight', W],
  ['weighted_dip', null, 'Weighted dip', null, 'bodyweight', W, { equipment: 'other', primaryMuscles: ['chest', 'triceps'] }],
  ['muscle_up', 'Muscle_Up', 'Muscle-up', null, 'bodyweight', R],
  ['rope_climb', 'Rope_Climb', 'Rope climb', null, 'bodyweight', R],
  ['handstand_push_up', null, 'Handstand push-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['shoulders', 'triceps'] }],
  ['pistol_squat', null, 'Pistol squat', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['quadriceps', 'glutes'] }],
  ['jump_squat', 'Freehand_Jump_Squat', 'Jump squat', null, 'bodyweight', R],
  ['split_jump', 'Split_Jump', 'Split jump', null, 'bodyweight', R],
  ['broad_jump', 'Standing_Long_Jump', 'Broad jump', null, 'bodyweight', R],
  ['tuck_jump', 'Knee_Tuck_Jump', 'Tuck jump', null, 'bodyweight', R],
  ['jumping_jack', null, 'Jumping jack', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['calves', 'shoulders'] }],
  ['nordic_curl', 'Natural_Glute_Ham_Raise', 'Nordic curl', null, 'bodyweight', R],
  ['single_leg_glute_bridge', 'Single_Leg_Glute_Bridge', 'Single-leg glute bridge', null, 'bodyweight', R],
  ['glute_bridge_bw', 'Butt_Lift_Bridge', 'Glute bridge', null, 'bodyweight', R],
  ['reverse_crunch', 'Reverse_Crunch', 'Reverse crunch', null, 'bodyweight', R],
  ['bicycle_crunch', 'Air_Bike', 'Bicycle crunch', null, 'bodyweight', R],
  ['leg_raise', 'Flat_Bench_Lying_Leg_Raise', 'Lying leg raise', null, 'bodyweight', R],
  ['flutter_kick', 'Flutter_Kicks', 'Flutter kicks', null, 'bodyweight', R],
  ['dead_bug', 'Dead_Bug', 'Dead bug', null, 'bodyweight', R],
  ['v_up', 'Jackknife_Sit-Up', 'V-up', null, 'bodyweight', R],
  ['dead_hang', null, 'Dead hang', null, 'bodyweight', T, { equipment: 'body only', primaryMuscles: ['forearms', 'lats'] }],
  ['l_sit', null, 'L-sit', null, 'bodyweight', T, { equipment: 'body only', primaryMuscles: ['abdominals'] }],
  ['hollow_hold', null, 'Hollow hold', null, 'bodyweight', T, { equipment: 'body only', primaryMuscles: ['abdominals'] }],
  ['wall_sit', null, 'Wall sit', null, 'bodyweight', T, { equipment: 'body only', primaryMuscles: ['quadriceps'] }],

  // Cardio & conditioning
  ['assault_bike', null, 'Assault bike', null, 'cardio', T, { activity: 'cycle', equipment: 'machine', primaryMuscles: ['quadriceps', 'shoulders'] }],
  ['ski_erg', null, 'Ski erg', null, 'cardio', D, { activity: 'ski', equipment: 'machine', primaryMuscles: ['lats', 'triceps'] }],
  // Not the dataset's "Wind Sprints", which is a hanging ab exercise.
  ['sprints', null, 'Sprints', null, 'cardio', T, { activity: 'run', equipment: 'none', primaryMuscles: ['quadriceps', 'hamstrings'] }],
  ['battle_ropes', 'Battling_Ropes', 'Battle ropes', null, 'cardio', T],
  ['sled_push', 'Sled_Push', 'Sled push', null, 'cardio', T],
  ['incline_walk', null, 'Incline walk', null, 'cardio', D, { activity: 'walk', equipment: 'machine', primaryMuscles: ['calves', 'glutes'] }],
  // Variations added 2026-10 (single-arm/leg, machines, cable attachments). Mettle-authored.
  // Single-arm & single-leg
  ['single_arm_db_press', null, 'Single-arm dumbbell shoulder press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['shoulders'] }],
  ['single_arm_db_bench_press', null, 'Single-arm dumbbell bench press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['chest'] }],
  ['single_arm_db_preacher_curl', null, 'Single-arm dumbbell preacher curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['biceps'] }],
  ['single_arm_overhead_db_extension', null, 'Single-arm overhead dumbbell extension', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['triceps'] }],
  ['single_arm_landmine_press', null, 'Single-arm landmine press', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['shoulders', 'chest'] }],
  ['single_arm_db_snatch', null, 'Dumbbell snatch', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['shoulders', 'hamstrings'] }],
  ['meadows_row', null, 'Meadows row', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['middle back', 'lats'] }],
  ['suitcase_carry', null, 'Suitcase carry', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['forearms', 'abdominals'] }],
  ['single_arm_cable_curl', null, 'Single-arm cable curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps'] }],
  ['single_arm_pushdown', null, 'Single-arm cable pushdown', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['single_arm_rope_pushdown', null, 'Single-arm rope pushdown', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['single_arm_overhead_cable_extension', null, 'Single-arm overhead cable triceps extension', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['cross_body_cable_extension', null, 'Cross-body cable triceps extension', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['single_arm_cable_fly', null, 'Single-arm cable fly', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['chest'] }],
  ['single_arm_cable_chest_press', null, 'Single-arm cable chest press', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['chest'] }],
  ['single_arm_cable_lateral_raise', null, 'Single-arm cable lateral raise', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['shoulders'] }],
  ['single_arm_cable_rear_delt_fly', null, 'Single-arm cable rear delt fly', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['shoulders'] }],
  ['single_arm_machine_row', null, 'Single-arm machine row', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['middle back', 'lats'] }],
  ['single_arm_machine_chest_press', null, 'Single-arm machine chest press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['chest'] }],
  ['single_arm_machine_shoulder_press', null, 'Single-arm machine shoulder press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['shoulders'] }],
  ['single_leg_press', null, 'Single-leg leg press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps', 'glutes'] }],
  ['single_leg_extension', null, 'Single-leg leg extension', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps'] }],
  ['single_leg_lying_curl', null, 'Single-leg lying leg curl', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['hamstrings'] }],
  ['single_leg_seated_calf_raise', null, 'Single-leg seated calf raise', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['calves'] }],
  ['one_arm_push_up', null, 'One-arm push-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['chest', 'triceps'] }],
  ['one_arm_pull_up', null, 'One-arm pull-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['lats', 'biceps'] }],
  // Machines
  ['belt_squat', null, 'Belt squat', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps', 'glutes'] }],
  ['pendulum_squat', null, 'Pendulum squat', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps'] }],
  ['vertical_leg_press', null, 'Vertical leg press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps'] }],
  ['horizontal_leg_press', null, 'Seated leg press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['quadriceps'] }],
  ['hip_thrust_machine', null, 'Hip thrust machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['glutes'] }],
  ['glute_kickback_machine', null, 'Glute kickback machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['glutes'] }],
  ['machine_back_extension', null, 'Back extension machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['lower back'] }],
  ['machine_lateral_raise', null, 'Machine lateral raise', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['shoulders'] }],
  ['machine_shrug', null, 'Machine shrug', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['traps'] }],
  ['smith_shrug', null, 'Smith machine shrug', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['traps'] }],
  ['smith_calf_raise', null, 'Smith machine calf raise', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['calves'] }],
  ['smith_hip_thrust', null, 'Smith machine hip thrust', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['glutes'] }],
  ['smith_row', null, 'Smith machine row', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['middle back'] }],
  ['machine_lat_pulldown', null, 'Machine lat pulldown', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['lats'] }],
  ['machine_pullover', null, 'Pullover machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['lats'] }],
  ['assisted_pull_up_machine', null, 'Assisted pull-up machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['lats'] }],
  ['decline_machine_press', null, 'Decline machine press', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['chest'] }],
  ['machine_fly', null, 'Machine chest fly', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['chest'] }],
  ['machine_ab_twist', null, 'Rotary torso machine', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['abdominals'] }],
  ['machine_hack_calf_raise', null, 'Hack squat calf raise', null, 'machine', W, { equipment: 'machine', primaryMuscles: ['calves'] }],
  // Cable attachments & variations
  ['bayesian_cable_curl', null, 'Bayesian cable curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps'] }],
  ['cable_hammer_curl', null, 'Cable rope hammer curl (two-hand)', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps', 'forearms'] }],
  ['incline_cable_curl', null, 'Incline cable curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps'] }],
  ['lying_cable_curl', null, 'Lying cable curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps'] }],
  ['cable_reverse_curl', null, 'Cable reverse curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['forearms'] }],
  ['cable_preacher_curl', null, 'Cable preacher curl', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['biceps'] }],
  ['v_bar_pushdown', null, 'V-bar pushdown', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['cable_skullcrusher', null, 'Cable skullcrusher', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['cable_triceps_kickback', null, 'Cable triceps kickback', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['triceps'] }],
  ['rope_face_pull', null, 'Rope face pull', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['shoulders'] }],
  ['cable_y_raise', null, 'Cable Y-raise', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['shoulders'] }],
  ['high_cable_fly', null, 'High-to-low cable fly', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['chest'] }],
  ['cable_pullover', null, 'Cable rope pullover', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['lats'] }],
  ['v_bar_pulldown', null, 'V-bar pulldown', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['lats'] }],
  ['wide_grip_cable_row', null, 'Wide-grip cable row', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['middle back'] }],
  ['kneeling_cable_crunch', null, 'Kneeling rope crunch', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['abdominals'] }],
  ['cable_leg_extension', null, 'Cable leg extension', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['quadriceps'] }],
  ['cable_abduction', null, 'Cable hip abduction', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['abductors'] }],
  ['cable_squat', null, 'Cable squat', null, 'machine', W, { equipment: 'cable', primaryMuscles: ['quadriceps'] }],
  // Free weights
  ['close_grip_db_press', null, 'Close-grip dumbbell press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['chest', 'triceps'] }],
  ['db_floor_press', null, 'Dumbbell floor press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['chest'] }],
  ['paused_bench_press', null, 'Paused bench press', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['chest'] }],
  ['incline_hammer_curl', null, 'Incline hammer curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['biceps'] }],
  ['seated_db_curl', null, 'Seated dumbbell curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['biceps'] }],
  ['cross_body_hammer_curl', null, 'Cross-body hammer curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['biceps', 'forearms'] }],
  ['db_reverse_curl', null, 'Dumbbell reverse curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['forearms'] }],
  ['db_wrist_curl', null, 'Dumbbell wrist curl', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['forearms'] }],
  ['reverse_wrist_curl', null, 'Reverse wrist curl', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['forearms'] }],
  ['seated_db_triceps_extension', null, 'Seated dumbbell triceps extension', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['triceps'] }],
  ['ez_bar_overhead_extension', null, 'EZ-bar overhead triceps extension', null, 'free_weight', W, { equipment: 'e-z curl bar', primaryMuscles: ['triceps'] }],
  ['tate_press', null, 'Tate press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['triceps'] }],
  ['db_front_squat', null, 'Dumbbell front squat', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['quadriceps'] }],
  ['db_deadlift', null, 'Dumbbell deadlift', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['hamstrings', 'lower back'] }],
  ['db_hip_thrust', null, 'Dumbbell hip thrust', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['glutes'] }],
  ['db_thruster', null, 'Dumbbell thruster', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['shoulders', 'quadriceps'] }],
  ['db_push_press', null, 'Dumbbell push press', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['shoulders'] }],
  ['renegade_row', null, 'Renegade row', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['middle back', 'abdominals'] }],
  ['db_lateral_raise_seated', null, 'Seated lateral raise', null, 'free_weight', W, { equipment: 'dumbbell', primaryMuscles: ['shoulders'] }],
  ['barbell_calf_raise', null, 'Barbell calf raise', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['calves'] }],
  ['zercher_squat', null, 'Zercher squat', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['quadriceps'] }],
  ['overhead_squat', null, 'Overhead squat', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['quadriceps', 'shoulders'] }],
  ['safety_bar_squat', null, 'Safety bar squat', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['quadriceps'] }],
  ['barbell_thruster', null, 'Barbell thruster', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['shoulders', 'quadriceps'] }],
  ['clean_and_jerk', null, 'Clean and jerk', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['quadriceps', 'shoulders'] }],
  ['seal_row', null, 'Seal row', null, 'free_weight', W, { equipment: 'barbell', primaryMuscles: ['middle back'] }],
  // Bodyweight
  ['neutral_grip_pull_up', null, 'Neutral-grip pull-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['lats'] }],
  ['hanging_knee_raise', null, 'Hanging knee raise', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['abdominals'] }],
  ['toes_to_bar', null, 'Toes-to-bar', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['abdominals'] }],
  ['pike_push_up', null, 'Pike push-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['shoulders', 'triceps'] }],
  ['archer_push_up', null, 'Archer push-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['chest'] }],
  ['bodyweight_lunge', null, 'Bodyweight lunge', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['quadriceps'] }],
  ['side_lunge', null, 'Side lunge', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['quadriceps', 'adductors'] }],
  ['bodyweight_calf_raise', null, 'Bodyweight calf raise', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['calves'] }],
  ['decline_sit_up', null, 'Decline sit-up', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['abdominals'] }],
  ['superman', null, 'Superman', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['lower back'] }],
  ['sissy_squat', null, 'Sissy squat', null, 'bodyweight', R, { equipment: 'body only', primaryMuscles: ['quadriceps'] }],
];

// Movement-pattern glyph per exercise (src/design/icons/glyphs.ts). First match wins.
const ICON_RULES = [
  ['carry', /farmer|carry|shrug/],
  ['run', /\b(run|sprints?)\b/],
  ['walk', /\b(walk|hike)\b/],
  ['bike', /\b(bike|ride|cycl)/],
  ['rower', /rowing machine/],
  ['swim', /\bswim/],
  ['cardio', /elliptical|stair|jump rope|ski erg|battle ropes|sled/],
  ['jump', /box jump|jump|burpee|jack\b/],
  ['hold', /plank|hollow|l-sit|wall sit|dead hang/],
  ['calf', /calf/],
  ['lunge', /lunge|split|step-up|pistol/],
  ['core', /leg raise|crunch|sit-up|twist|ab wheel|v-up|dead bug|flutter|woodchop|pallof|side bend|windmill|landmine rotation|mountain climber|rotary torso|toes-to-bar|superman/],
  ['hinge', /deadlift|\brdl\b|good morning|swing|hip thrust|glute bridge|rack pull|pull-through|back extension|reverse hyper|glute-ham|nordic|glute kickback/],
  ['fly', /\bfly\b|crossover|pec deck|pullover/],
  ['pullup', /pull-up|chin-up|pulldown|muscle-up|rope climb/],
  ['raise', /raise|rear delt|upright row|external rotation/],
  ['row', /\brow\b|face pull/],
  ['curl', /curl(?<!leg curl)/],
  ['extension', /triceps|skullcrusher|pushdown|jm press|dip|overhead dumbbell extension|tate press/],
  ['overhead', /overhead press|shoulder press|military|arnold|push press|landmine press|kettlebell press|handstand|clean|snatch|thruster|get-up|seated barbell press|seated dumbbell press/],
  ['press', /bench|chest press|push-up|floor press|dumbbell press|(in|de)cline (machine )?press/],
  ['squat', /squat|leg press|hack|leg extension|leg curl|abduction|adduction/],
];
const CATEGORY_ICON = { free_weight: 'press', machine: 'press', bodyweight: 'core', cardio: 'cardio' };

function iconFor(name, category) {
  const n = name.toLowerCase();
  const hit = ICON_RULES.find(([, re]) => re.test(n));
  if (!hit) unmatched.push(name);
  return hit ? hit[0] : CATEGORY_ICON[category];
}
const unmatched = [];

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const dataset = new Map((await res.json()).map((e) => [e.id, e]));

const seen = new Set();
const usedCodes = new Set(CATALOGUE.map((e) => e[3]).filter(Boolean));

/** Initials of the name (max 3), extended letter by letter until unique. */
function autoCode(name) {
  const words = name.replace(/[^A-Za-z ]+/g, ' ').trim().split(/\s+/);
  const initials = words.map((w) => w[0].toUpperCase()).join('').slice(0, 3);
  const pool = words.join('').toUpperCase();
  let code = initials.length >= 2 ? initials : pool.slice(0, 2);
  for (let i = 0; usedCodes.has(code); i++) {
    code = (initials.slice(0, 2) + pool[(i + 1) % pool.length]).slice(0, 3);
    if (i > pool.length) code = initials.slice(0, 2) + String(i);
  }
  usedCodes.add(code);
  return code;
}
const exercises = CATALOGUE.map(([id, datasetId, name, shortCode, category, trackingType, extras = {}]) => {
  const short = shortCode ?? autoCode(name);
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
    icon: iconFor(name, category),
    equipment: extras.equipment ?? src?.equipment ?? null,
    primaryMuscles: extras.primaryMuscles ?? src?.primaryMuscles ?? [],
    ...(extras.activity ? { activity: extras.activity } : {}),
    ...(extras.benchmarkId ? { benchmarkId: extras.benchmarkId } : {}),
    source: datasetId ? `free-exercise-db:${datasetId}` : 'mettle',
  };
});

writeFileSync(
  new URL('../config/exercises.json', import.meta.url),
  JSON.stringify({ version: 'exercises.v2', exercises }, null, 2) + '\n',
);
console.log(`Wrote ${exercises.length} exercises`);
if (unmatched.length) console.log('Icon fallback (category default):', unmatched.join(', '));
