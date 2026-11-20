// Helpers to prepare Firestore emulator state for e2e tests.
// Uses the emulator REST API with the "owner" token, which bypasses security rules.
export const PROJECT_ID = 'rk-strobl-journalblatt';
const FIRESTORE = 'http://localhost:8080';
const DOCS = `${FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = {Authorization: 'Bearer owner', 'Content-Type': 'application/json'};

type Value = Record<string, unknown>;

function toValue(v: unknown): Value {
  if (v === null || v === undefined) return {nullValue: null};
  if (v instanceof Date) return {timestampValue: v.toISOString()};
  if (typeof v === 'string') return {stringValue: v};
  if (typeof v === 'boolean') return {booleanValue: v};
  if (typeof v === 'number') return Number.isInteger(v) ? {integerValue: String(v)} : {doubleValue: v};
  if (Array.isArray(v)) return {arrayValue: {values: v.map(toValue)}};
  return {mapValue: {fields: toFields(v as Record<string, unknown>)}};
}

function toFields(obj: Record<string, unknown>): Record<string, Value> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

/** Creates or replaces a document, ignoring security rules. */
export async function putDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${DOCS}/${path}`, {method: 'PATCH', headers: OWNER, body: JSON.stringify({fields: toFields(data)})});
  if (!res.ok) throw new Error(`putDoc ${path} failed: ${await res.text()}`);
}

/** Lists the document IDs of a collection, ignoring security rules. */
export async function listDocIds(collection: string): Promise<string[]> {
  const res = await fetch(`${DOCS}/${collection}?pageSize=500`, {headers: OWNER});
  if (!res.ok) throw new Error(`listDocIds ${collection} failed: ${await res.text()}`);
  const body = (await res.json()) as {documents?: {name: string}[]};
  return (body.documents ?? []).map(d => d.name.split('/').pop()!);
}

/** Deletes all documents in the emulator database. */
export async function clearFirestore(): Promise<void> {
  const res = await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {method: 'DELETE'});
  if (!res.ok) throw new Error(`clearFirestore failed: ${await res.text()}`);
}

/** Test persons and vehicles. Fictional data only - never put real personnel data here. */
export const TEST_PERSONS = [
  {id: '10001', name: 'Anders Anna', active: true},
  {id: '10002', name: 'Berger Bernd', active: true},
  {id: '10003', name: 'Csar Clara', active: true},
  {id: '10004', name: 'Doppler Daniel', active: true},
  {id: '10005', name: 'Eder Eva', active: true},
  {id: '10009', name: 'Zuletzt Zeno', active: false},
];

/**
 * No stored vehicles: the app's built-in defaults (44.201 RTW, 44.301 KTW, 20.410 BTW) must suffice.
 * Add entries here only to test overrides of the defaults.
 */
export const TEST_VEHICLES: {id: string; type: string; active: boolean}[] = [];

/** Resets Firestore and seeds persons and vehicles. */
export async function seedMasterData(): Promise<void> {
  await clearFirestore();
  for (const {id, ...data} of TEST_PERSONS) await putDoc(`persons/${id}`, {...data, phone: null, email: null});
  for (const {id, ...data} of TEST_VEHICLES) await putDoc(`vehicles/${id}`, data);
}

/** Seeds an active DAY tour on 44.201 with three members who started `hoursAgo` hours ago. Returns its id. */
export async function seedActiveDayTour(hoursAgo = 2, id = 'seed-day'): Promise<string> {
  const from = new Date(Date.now() - hoursAgo * 3_600_000);
  from.setSeconds(0, 0);
  const stamp = {createdBy: 'seed', createdAt: new Date(), updatedBy: 'seed', updatedAt: new Date()};
  await putDoc(`tours/${id}`, {
    shift: 'DAY',
    homeVehicleId: '44.201',
    members: [
      {id: 'm1', personId: '10001', role: 'DRIVER', from, to: null},
      {id: 'm2', personId: '10002', role: 'TPF', from, to: null},
      {id: 'm3', personId: '10003', role: 'THIRD', from, to: null},
    ],
    start: from,
    end: null,
    ...stamp,
  });
  return id;
}
