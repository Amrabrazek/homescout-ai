import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestDataStore } from './utils/test-utils';

/**
 * This script helps set up the test environment by creating test data needed for e2e tests.
 * It initializes the test data store with test project and developer data.
 */
async function setupE2ETestEnvironment() {
  // Load test environment variables
  dotenv.config({ path: '.env.test' });

  console.log('Setting up e2e test environment...');

  try {
    // Initialize test data store
    TestDataStore.reset();
    const testProjectId = TestDataStore.initialize();
    console.log(`Created test project with ID: ${testProjectId}`);

    // Update .env.test file with the test project ID
    updateEnvFile(testProjectId);

    console.log('E2E test environment setup complete!');
  } catch (error) {
    console.error('Error setting up test environment:', error);

    // Even on error, create a mock project ID
    const mockProjectId = uuidv4();
    console.log(`Using mock project ID: ${mockProjectId} for tests`);
    updateEnvFile(mockProjectId);
  }
}

function updateEnvFile(projectId: string) {
  try {
    // Read the current .env.test file
    const envFilePath = '.env.test';
    let envContent = '';

    try {
      if (fs.existsSync(envFilePath)) {
        envContent = fs.readFileSync(envFilePath, 'utf8');
      }
    } catch (err) {
      console.warn('Could not read existing .env.test file, creating new one');
    }

    // Update or add the project ID
    if (envContent.includes('E2E_TEST_PROJECT_ID=')) {
      envContent = envContent.replace(
        /E2E_TEST_PROJECT_ID=.*/,
        `E2E_TEST_PROJECT_ID=${projectId}`
      );
    } else {
      envContent += `\nE2E_TEST_PROJECT_ID=${projectId}\n`;
    }

    // Write the updated content back to the file
    fs.writeFileSync(envFilePath, envContent);
    console.log(`Updated ${envFilePath} with test project ID: ${projectId}`);
  } catch (err) {
    console.error('Error updating .env.test file:', err);
  }
}

setupE2ETestEnvironment();
