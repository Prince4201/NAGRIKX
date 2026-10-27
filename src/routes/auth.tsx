import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pageHead } from '@/lib/page-head';
import { AuthShell } from '@/components/forms/AuthShell';
import { FormNotice } from '@/components/forms/FormField';
import { Button } from '@/components/ui/button';
export const Route=createFileRoute('/auth')({head:()=>pageHead('Confirm your account','Complete your NAGRIKX account confirmation and sign-in.'),component:AuthCallback});
function AuthCallback(){const navigate=useNavigate();const [notice,setNotice]=useState('Checking your account…');useEffect(()=>{let mounted=true;const complete=async()=>{const url=new URL(window.location.href);const code=url.searchParams.get('code');if(code){const r=await supabase.auth.exchangeCodeForSession(code);if(r.error){if(mounted)setNotice('This confirmation link is invalid or has expired.');return;}}const {data}=await supabase.auth.getUser();if(!mounted)return;if(data.user)navigate({to:'/dashboard',replace:true});else setNotice('Your email confirmation is complete. Please sign in to continue.');};void complete();return()=>{mounted=false;};},[navigate]);return <AuthShell title="Welcome to NAGRIKX" subtitle="Your city is waiting." footer={<Link to="/login" className="underline underline-offset-4">Return to sign in</Link>}><FormNotice>{notice}</FormNotice><Button asChild className="mt-5"><Link to="/login">Sign in</Link></Button></AuthShell>;}
