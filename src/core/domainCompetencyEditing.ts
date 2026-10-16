import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {CompetencyRequirements} from './competencies';

/** Commit a complete validated contract, preserving the caller's project on failure. */
export function editDomainCompetencies(project: DomainProjectV6, value: CompetencyRequirements | undefined): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  const {competencyRequirements: _previous, ...rest} = current;
  return parseDomainProjectV6(JSON.stringify(value === undefined ? rest : {...rest, competencyRequirements: value}));
}
