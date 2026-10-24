import type { DemoIssue, IssueCategoryId, IssueStatus } from './demo-data';
export interface IssueFilters { query: string; category: IssueCategoryId | 'all'; status: IssueStatus | 'all'; sort: 'default' | 'locality'; }
export function filterIssues(issues: DemoIssue[], filters: IssueFilters) {
  const query = filters.query.trim().toLowerCase();
  const result = issues.filter(issue => (!query || `${issue.locality} ${issue.title} ${issue.id}`.toLowerCase().includes(query)) && (filters.category === 'all' || issue.category === filters.category) && (filters.status === 'all' || issue.status === filters.status));
  return filters.sort === 'locality' ? [...result].sort((a,b) => a.locality.localeCompare(b.locality)) : result;
}
