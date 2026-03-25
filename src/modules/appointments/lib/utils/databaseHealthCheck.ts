import { supabase } from '@/lib/supabase';

export interface TableHealthCheck {
  tableName: string;
  exists: boolean;
  rowCount: number | null;
  error?: string;
}

export interface DatabaseHealth {
  isHealthy: boolean;
  tables: TableHealthCheck[];
  missingTables: string[];
  errors: string[];
}

const REQUIRED_TABLES = [
  'organizations',
  'resources',
  'skills',
  'locations',
  'territories',
  'use_case_configs',
  'event_types',
  'event_type_resources',
  'resource_availability_rules',
  'resource_skills',
  'resource_territories',
  'client_credits',
  'booking_resources',
];

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const health: DatabaseHealth = {
    isHealthy: true,
    tables: [],
    missingTables: [],
    errors: [],
  };

  for (const tableName of REQUIRED_TABLES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const schema = ['organizations', 'locations'].includes(tableName) ? 'identity' : 'calendar';

      const { count, error } = await supabase
        .schema(schema)
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        health.tables.push({
          tableName,
          exists: false,
          rowCount: null,
          error: error.message,
        });
        health.missingTables.push(tableName);
        health.errors.push(`Table ${tableName}: ${error.message}`);
        health.isHealthy = false;
      } else {
        health.tables.push({
          tableName,
          exists: true,
          rowCount: count || 0,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      health.tables.push({
        tableName,
        exists: false,
        rowCount: null,
        error: errorMessage,
      });
      health.missingTables.push(tableName);
      health.errors.push(`Table ${tableName}: ${errorMessage}`);
      health.isHealthy = false;
    }
  }

  return health;
}

export async function logDatabaseHealth(): Promise<void> {
  console.log('🔍 Checking database health...');
  const health = await checkDatabaseHealth();

  if (health.isHealthy) {
    console.log('✅ Database is healthy!');
    console.table(
      health.tables.map((t) => ({
        Table: t.tableName,
        Status: t.exists ? '✓' : '✗',
        Rows: t.rowCount ?? 'N/A',
      }))
    );
  } else {
    console.error('❌ Database has issues:');
    console.table(
      health.tables.map((t) => ({
        Table: t.tableName,
        Status: t.exists ? '✓' : '✗',
        Rows: t.rowCount ?? 'N/A',
        Error: t.error || '',
      }))
    );
    console.error('\nMissing tables:', health.missingTables);
    console.error('Errors:', health.errors);
  }
}
