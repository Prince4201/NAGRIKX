import { queryOptions } from '@tanstack/react-query';
import { getWorkspace, getReport } from './civic.functions';
export const workspaceQuery=queryOptions({queryKey:['workspace'],queryFn:()=>getWorkspace(),staleTime:10000});
export const reportQuery=(id:string)=>queryOptions({queryKey:['report',id],queryFn:()=>getReport({data:{id}})});
