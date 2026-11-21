import {PROJECT_ID, seedMasterData, TEST_ACCOUNTS} from './helpers/emulator';

const AUTH_EMULATOR_URL = 'http://localhost:9099';

/** Creates a login account with a fixed uid (admin call to the Auth emulator). */
async function createAccount(uid: string, email: string, password: string): Promise<void> {
  const response = await fetch(`${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts?key=fake-api-key`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: 'Bearer owner'},
    body: JSON.stringify({localId: uid, email, password}),
  });
  if (!response.ok) throw new Error(`Failed to create test account ${email}: ${await response.text()}`);
}

async function globalSetup() {
  // Clear existing accounts in the emulator
  await fetch(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`, {method: 'DELETE'});

  for (const {uid, email, password} of Object.values(TEST_ACCOUNTS)) await createAccount(uid, email, password);

  // Reset Firestore and seed user entries, persons and vehicles
  await seedMasterData();
}

export default globalSetup;
