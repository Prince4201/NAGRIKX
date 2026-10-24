import { describe, expect, it } from 'vitest';
import { DEMO_ISSUES } from './demo-data';
import { filterIssues, type IssueFilters } from './issue-discovery';
const defaults: IssueFilters = { query: '', category: 'all', status: 'all', sort: 'default' };
describe('Issue discovery', () => {
 it('combines query, category and status', () => { expect(filterIssues(DEMO_ISSUES,{...defaults,query:'MG ROAD',category:'roads',status:'in_progress'}).map(i=>i.id)).toEqual(['NX-1042']); expect(filterIssues(DEMO_ISSUES,{...defaults,category:'roads',status:'resolved'})).toEqual([]); });
 it('finds an exact sample report ID', () => { expect(filterIssues(DEMO_ISSUES,{...defaults,query:'nx-1044'}).map(i=>i.id)).toEqual(['NX-1044']); });
 it('sorts localities without mutating samples', () => { expect(filterIssues(DEMO_ISSUES,{...defaults,sort:'locality'}).map(i=>i.locality)).toEqual(['Civil Lines','Gandhi Nagar','MG Road','Rajpur','Sadar Bazaar']); expect(DEMO_ISSUES[0]?.id).toBe('NX-1042'); });
});
