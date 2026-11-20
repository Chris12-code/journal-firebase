import {Auth} from 'firebase/auth';
import {DocumentData, onSnapshot, Query, QuerySnapshot, serverTimestamp} from 'firebase/firestore';
import {Observable} from 'rxjs';

/** Live query results as an observable. Pending server timestamps are estimated locally. */
export function watchQuery<T>(q: Query, map: (id: string, data: DocumentData) => T): Observable<T[]> {
  return new Observable<T[]>(subscriber =>
    onSnapshot(
      q,
      snap => subscriber.next(mapSnapshot(snap, map)),
      err => subscriber.error(err),
    ),
  );
}

export function mapSnapshot<T>(snap: QuerySnapshot, map: (id: string, data: DocumentData) => T): T[] {
  return snap.docs.map(d => map(d.id, d.data({serverTimestamps: 'estimate'})));
}

/** Merges lists by id; later lists win. */
export function mergeById<T extends {id?: string}>(...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const item of list) byId.set(item.id!, item);
  return [...byId.values()];
}

function currentUid(auth: Auth): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Nicht angemeldet.');
  return uid;
}

/** Author stamps for a new document (design D8). */
export function createStamps(auth: Auth): DocumentData {
  const uid = currentUid(auth);
  return {createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp()};
}

/** Author stamps for an update; creator fields stay untouched. */
export function updateStamps(auth: Auth): DocumentData {
  return {updatedBy: currentUid(auth), updatedAt: serverTimestamp()};
}
