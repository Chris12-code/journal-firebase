import {PROJECT_ID, seedMasterData} from './helpers/emulator';

const AUTH_EMULATOR_URL = 'http://localhost:9099';

async function globalSetup() {
  // Clear existing users in the emulator
  await fetch(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`, {method: 'DELETE'});

  // Create test user via Auth emulator REST API
  const response = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'test@example.com', password: 'password123', returnSecureToken: true}),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to create test user: ${await response.text()}`);
  }

  // Reset Firestore and seed persons and vehicles
  await seedMasterData();
}

export default globalSetup;
