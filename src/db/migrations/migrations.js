// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_exercise_short_name.sql';
import m0002 from './0002_workout_status.sql';
import m0003 from './0003_rest_seconds.sql';
import m0004 from './0004_sync_tables.sql';
import m0005 from './0005_sync_triggers.sql';
import m0006 from './0006_drop_height.sql';
import m0007 from './0007_profile_about_avatar.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007
    }
  }
  