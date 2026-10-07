import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_exercise_short_name.sql';
import m0002 from './0002_workout_status.sql';
import m0003 from './0003_rest_seconds.sql';
import m0004 from './0004_sync_tables.sql';
import m0005 from './0005_sync_triggers.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  