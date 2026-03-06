import React, { useState } from 'react';
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { seedAllUseCases } from '../../lib/data/comprehensiveSeedData';
import { checkDatabaseHealth } from '../../lib/utils/databaseHealthCheck';
import { supabase } from '@/lib/supabase';

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSeed() {
    setIsSeeding(true);
    setStatus('idle');
    setMessage('');

    try {
      console.log('🔍 Checking database health...');
      const health = await checkDatabaseHealth();

      if (!health.isHealthy) {
        console.error('❌ Database health check failed:', health.errors);
        setStatus('error');
        setMessage(`Database is not ready. Missing tables: ${health.missingTables.join(', ')}. Please ensure all migrations have been applied.`);
        return;
      }

      console.log('✅ Database health check passed');
      console.log('🌱 Starting seed process...');

      // Add a 60-second safety timeout for the entire process
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Seeding process timed out after 60 seconds. Please check your internet connection and Supabase availability.')), 60000)
      );

      const results = await Promise.race([
        seedAllUseCases(),
        timeoutPromise
      ]) as any;

      const failed = results.filter((r: any) => r.status === 'error');

      if (failed.length > 0) {
        setStatus('error');
        setMessage(`Seeding partially failed for: ${failed.map((f: any) => f.key).join(', ')}. Check console for details.`);
      } else {
        const { count } = await supabase.schema('calendar').from('event_types').select('*', { count: 'exact', head: true });
        console.log(`✅ Seeding complete! Total Event Types in DB: ${count}`);

        setStatus('success');
        setMessage(`All use case data seeded successfully! (${count} event types active) Page will reload in 2 seconds...`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Error seeding data:', error);
      setStatus('error');

      let errorMessage = 'Unknown error occurred';
      if (typeof error === 'string') errorMessage = error;
      else if (error?.message) errorMessage = error.message;
      else if (error?.error_description) errorMessage = error.error_description;
      else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = String(error);
        }
      }

      // Check for specific constraint errors to guide the user
      if (errorMessage.includes('event_types_booking_mode_check') || errorMessage.includes('event_types_assignment_strategy_check') || (error?.code === '23514')) {
        setMessage(`Failed to seed data: Database constraint violation. Please run the "Nuclear Fix" SQL script (20260204_nuclear_constraint_fix.sql) in your Supabase SQL Editor and try again.`);
      } else {
        setMessage(`Failed to seed data: ${errorMessage}. Check browser console (F12) for full details.`);
      }
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleSeed}
        disabled={isSeeding}
        className="flex items-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSeeding ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Seeding Data...</span>
          </>
        ) : (
          <>
            <Database className="w-5 h-5" />
            <span>Seed All Use Cases</span>
          </>
        )}
      </button>

      {status !== 'idle' && (
        <div
          className={`mt-2 p-4 rounded-lg shadow-lg max-w-md ${status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          <div className="flex items-start space-x-3">
            {status === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
