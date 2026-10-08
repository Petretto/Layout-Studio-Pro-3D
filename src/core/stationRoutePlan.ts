import type {DomainProjectV6} from './domainProject';
import type {DeclaredTransportRoute, StationCandidate, StationCopyRef} from './stationRouting';

export interface ForwardRoutePlan {route: DeclaredTransportRoute; next: ForwardRoutePlan | null}
const key = (ref: StationCopyRef) => JSON.stringify([ref.stationId, ref.copy]);

/** Compare the next leg first, then successive legs; no sum or transport duration is inferred. */
export function compareForwardRoutes(left: ForwardRoutePlan | null, right: ForwardRoutePlan | null): number {
  while (left && right) {
    const difference = left.route.distanceMm - right.route.distanceMm;
    if (difference) return difference;
    left = left.next; right = right.next;
  }
  return left ? 1 : right ? -1 : 0;
}

/** A preference for a linear operation chain, not an advance resource reservation. */
export function createStationRoutePlan(project: DomainProjectV6,
  operationIds: readonly string[], candidates: ReadonlyMap<string, readonly StationCandidate[]>) {
  const routing = project.stationRouting!;
  const operations = new Map(project.operations.map(operation => [operation.id, operation]));
  for (let index = 0; index < operationIds.length; index++) {
    const operation = operations.get(operationIds[index])!;
    const nextCount = project.operations.filter(item => item.predecessorIds.includes(operation.id)).length;
    if (operation.predecessorIds.length !== (index ? 1 : 0) || nextCount !== (index < operationIds.length - 1 ? 1 : 0)) {
      throw new Error('Niejednoznaczny następny proces: automatyczna trasa wymaga jednego ciągu operacji; fizyczne gałęzie należą do 2.7/2.8.');
    }
  }
  const routes = new Map(routing.routes.map(route => [JSON.stringify([key(route.from), key(route.to)]), route]));
  const routeBetween = (from: StationCopyRef, to: StationCopyRef) => {
    const route = routes.get(JSON.stringify([key(from), key(to)]));
    if (!route) throw new Error(`Brak rzeczywistej trasy z ${from.stationId}/${from.copy} do ${to.stationId}/${to.copy}.`);
    return route;
  };
  const plans = new Map<string, Map<string, ForwardRoutePlan | null>>();
  for (let index = operationIds.length - 1; index >= 0; index--) {
    const id = operationIds[index];
    const byCopy = new Map<string, ForwardRoutePlan | null>();
    for (const candidate of candidates.get(id)!) {
      let best: ForwardRoutePlan | null = null;
      if (index < operationIds.length - 1) {
        const nextId = operationIds[index + 1];
        for (const target of candidates.get(nextId)!) {
          const plan = {route: routeBetween(candidate, target), next: plans.get(nextId)!.get(key(target))!};
          if (!best || compareForwardRoutes(plan, best) < 0) best = plan;
        }
      }
      byCopy.set(key(candidate), best);
    }
    plans.set(id, byCopy);
  }
  return {routeBetween, forward: (operationId: string, candidate: StationCopyRef) => plans.get(operationId)!.get(key(candidate))!};
}

export interface BodyBranchPreference {
  distanceMm: number;
  route?: DeclaredTransportRoute;
  next: readonly BodyBranchPreference[];
}

/** Technological branch order, next legs before later legs; never sum distances. */
export function compareBodyBranchPreferences(left: readonly BodyBranchPreference[], right: readonly BodyBranchPreference[]): number {
  // Joined branches share downstream plans. Compare each pair once, not once per graph path.
  const cache = new WeakMap<readonly BodyBranchPreference[], WeakMap<readonly BodyBranchPreference[], number>>();
  const compare = (a: readonly BodyBranchPreference[], b: readonly BodyBranchPreference[]): number => {
    if (a === b) return 0;
    const known = cache.get(a)?.get(b);
    if (known !== undefined) return known;
    let result = 0;
    for (let index = 0; index < Math.min(a.length, b.length); index++) {
      result = a[index].distanceMm - b[index].distanceMm;
      if (result) break;
    }
    result ||= a.length - b.length;
    if (!result) for (let index = 0; index < a.length; index++) {
      result = compare(a[index].next, b[index].next);
      if (result) break;
    }
    const byRight = cache.get(a) ?? new WeakMap<readonly BodyBranchPreference[], number>();
    byRight.set(b, result);cache.set(a, byRight);
    return result;
  };
  return compare(left, right);
}

/** A body route preference only. Preparation neither moves the body nor reserves future copies. */
export function createBodyBranchRoutePlan(project: DomainProjectV6,
  operationIds: readonly string[], candidates: ReadonlyMap<string, readonly StationCandidate[]>) {
  const operations = new Map(project.operations.map(operation => [operation.id, operation]));
  const successors = new Map(operationIds.map(id => [id,
    operationIds.filter(next => operations.get(next)!.predecessorIds.includes(id))]));
  const routes = new Map(project.stationRouting!.routes.map(route => [JSON.stringify([key(route.from), key(route.to)]), route]));
  const plans = new Map<string, Map<string, readonly BodyBranchPreference[]>>();
  for (const id of [...operationIds].reverse()) {
    const byCopy = new Map<string, readonly BodyBranchPreference[]>();
    if (operations.get(id)!.physicalRole?.kind === 'body-work') {
      // Walk through preparation nodes to the first body operation on each path.
      const frontier = new Set<string>();
      const visited = new Set<string>();
      const visit = (next: string) => {
        if (visited.has(next)) return;
        visited.add(next);
        if (operations.get(next)!.physicalRole?.kind === 'body-work') frontier.add(next);
        else successors.get(next)!.forEach(visit);
      };
      successors.get(id)!.forEach(visit);
      const ordered = operationIds.filter(next => frontier.has(next));
      for (const candidate of candidates.get(id)!) {
        const preference = ordered.map(nextId => {
          let best: BodyBranchPreference | undefined;
          for (const target of candidates.get(nextId)!) {
            const route = key(candidate) === key(target) ? undefined :
              routes.get(JSON.stringify([key(candidate), key(target)]));
            if (!route && key(candidate) !== key(target)) {
              throw new Error(`Brak rzeczywistej trasy z ${candidate.stationId}/${candidate.copy} do ${target.stationId}/${target.copy}.`);
            }
            const leg: BodyBranchPreference = {distanceMm: route?.distanceMm ?? 0,
              ...(route ? {route} : {}), next: plans.get(nextId)!.get(key(target))!};
            if (!best || leg.distanceMm < best.distanceMm || leg.distanceMm === best.distanceMm &&
                compareBodyBranchPreferences(leg.next, best.next) < 0) best = leg;
          }
          return best!;
        });
        byCopy.set(key(candidate), preference);
      }
    }
    plans.set(id, byCopy);
  }
  return {forward: (operationId: string, candidate: StationCopyRef) =>
    plans.get(operationId)!.get(key(candidate)) ?? []};
}
