import { seedAllUseCases } from '../data/comprehensiveSeedData';

export async function initializeAllUseCases() {
  try {
    console.log('Starting to seed all use cases...');
    await seedAllUseCases();
    console.log('All use cases seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding use cases:', error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  (window as any).seedAllUseCases = initializeAllUseCases;
}
