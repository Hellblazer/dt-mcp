#!/usr/bin/env node

import { DEVONthinkEnhancedService } from './src/services/devonthink_enhanced.js';

console.log('Testing DEVONthinkEnhancedService directly...');

const service = new DEVONthinkEnhancedService({
  maxConcurrent: 3,
  resourceMonitorOptions: { autoStart: false }
});

console.log('Service created:', service.constructor.name);
console.log('Has createResearchProject method?', typeof service.createResearchProject === 'function');

try {
  const result = await service.createResearchProject({
    projectName: "Test Project",
    description: "Test description"
  });
  console.log('Result:', result);
} catch (error) {
  console.log('Error caught:', error.message);
}