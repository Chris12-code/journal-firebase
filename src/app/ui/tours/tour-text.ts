import {MasterDataService} from '../../application/master-data.service';
import {CrewMember, ROLES, SHIFT_LABELS, Tour} from '../../domain/model';
import {OverlapWarning, tourStart} from '../../domain/tour';
import {formatTime} from '../shared/datetime';

/** "Tag · 44.201 (RTW)" / "Nacht · ohne Fahrzeug". */
export function tourTitle(tour: Tour, md: MasterDataService): string {
  const vehicle = tour.homeVehicleId ? md.vehicleLabel(tour.homeVehicleId) : 'ohne Fahrzeug';
  return `${SHIFT_LABELS[tour.shift]} · ${vehicle}`;
}

/** "Tag · 44.201 (RTW) · ab 06:00" for pickers. */
export function tourOptionLabel(tour: Tour, md: MasterDataService): string {
  return `${tourTitle(tour, md)} · ab ${formatTime(tourStart(tour))}`;
}

/** Crew entries ordered by start time, then by role. */
export function sortedMembers(tour: Tour): CrewMember[] {
  return [...tour.members].sort(
    (a, b) => a.from.getTime() - b.from.getTime() || ROLES.indexOf(a.role) - ROLES.indexOf(b.role),
  );
}

/** Human readable overlap warnings, one per conflicting pair. */
export function describeWarnings(warnings: OverlapWarning[], tours: Tour[], md: MasterDataService): string[] {
  const seen = new Set<string>();
  const texts: string[] = [];
  for (const w of warnings) {
    const key = [w.memberId, w.conflictMemberId].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const name = md.personName(w.personId);
    if (w.sameTour) {
      texts.push(`${name} ist in dieser Tour zeitlich doppelt eingetragen.`);
    } else {
      const other = tours.find(t => t.id === w.conflictTourId);
      texts.push(`${name} ist gleichzeitig in der Tour „${other ? tourOptionLabel(other, md) : 'unbekannt'}“ eingetragen.`);
    }
  }
  return texts;
}
