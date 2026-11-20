// Shared test fixtures for domain and application specs. Not used by production code.
import {Tour} from '../model';

/** Local time on 3 March 2027 (+ day offset). */
export const t = (h: number, m = 0, day = 0) => new Date(2027, 2, 3 + day, h, m);

/** DAY tour on 44.201 with driver huber, TPF maier and third beer, all from 06:00 and still open. */
export function dayTour(): Tour {
  return {
    id: 'day',
    shift: 'DAY',
    homeVehicleId: '44.201',
    members: [
      {id: 'd', personId: 'huber', role: 'DRIVER', from: t(6)},
      {id: 'p', personId: 'maier', role: 'TPF', from: t(6)},
      {id: 'x', personId: 'beer', role: 'THIRD', from: t(6)},
    ],
  };
}

/** NIGHT tour without vehicle with driver beshiri and TPF eder from 18:00, still open. */
export function nightTour(): Tour {
  return {
    id: 'night',
    shift: 'NIGHT',
    members: [
      {id: 'nd', personId: 'beshiri', role: 'DRIVER', from: t(18)},
      {id: 'np', personId: 'eder', role: 'TPF', from: t(18)},
    ],
  };
}
