import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion, useScroll, useMotionValueEvent, useTransform, useSpring, type MotionValue } from 'motion/react';
import { ArrowRight, MapPin, ShieldCheck, ArrowUpRight, CheckCircle2, ArrowDown, ScanSearch, Route, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEMO_ISSUES, getCategory, STATUS_LABEL } from '@/lib/demo-data';
import { CityFrameSequence } from './CityFrameSequence';
import { cn } from '@/lib/utils';
const chapters = [
 {label:'Your city',icon:ScanSearch,detail:'For the places we call home.'},
 {label:'Your voice',icon:MapPin,detail:'One report. A clearer picture.'},
 {label:'The journey',icon:Route,detail:'Every report. A visible path forward.'},
 {label:'Real change',icon:HeartHandshake,detail:'A better neighbourhood starts with us.'},
] as const;
function ChapterProgress({ progress, index, reduced }: { progress: MotionValue<number>; index: number; reduced: boolean }) {
 const local=useTransform(progress,v=>Math.max(0,Math.min(1,v*4-index)));
 return <motion.span className="absolute inset-0 origin-left bg-ember" style={{scaleX:reduced?1:local}} />;
}
export function Hero() {
 const prefersReduced=useReducedMotion();
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>setHydrated(true),[]);
 const reduce=hydrated && prefersReduced;
 const ref=useRef<HTMLElement>(null);
 const [chapter,setChapter]=useState(0);
 const {scrollYProgress}=useScroll({target:ref,offset:['start start','end end']});
 const smoothProgress=useSpring(scrollYProgress,{stiffness:120,damping:28});
 const cardsY=useTransform(smoothProgress,[0,.3,.65,1],[20,-18,12,-12]);
 const cardRotate=useTransform(smoothProgress,[0,.5,1],[1,-1,0]);
 useMotionValueEvent(scrollYProgress,'change',v=>{if(!reduce)setChapter(Math.min(3,Math.floor(v*4)));});
 const current=chapters[chapter]??chapters[0];
 const fade=(i:number)=>({initial:reduce?false:{opacity:0,y:18},animate:{opacity:1,y:0},transition:{duration:.7,delay:i*.1}});
 function choose(i:number){if(reduce||!ref.current)return;const start=window.scrollY+ref.current.getBoundingClientRect().top;window.scrollTo({top:start+(ref.current.offsetHeight-window.innerHeight)*((i+.35)/4),behavior:'smooth'});}
 return <section ref={ref} id="opening-city" aria-label="NAGRIKX opening city sequence" className={cn('hero-scroll relative bg-ivory',reduce&&'hero-scroll-static')}>
  <div className="hero-sticky sticky top-[72px]">
   <div className="hero-scene relative isolate overflow-hidden bg-ivory">
    <CityFrameSequence progress={scrollYProgress} reduced={Boolean(reduce)} />
    <div className="hero-shade absolute inset-0 -z-10" />
    <div className="hero-inner relative mx-auto max-w-6xl px-6 py-10 md:px-8 lg:px-0">
     <div className="hero-copy relative z-10 max-w-md">
      <motion.p {...fade(0)} className="mb-5 flex items-center gap-2 text-xs font-semibold text-forest sm:text-sm"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />NAGRIKX · A better city starts with you</motion.p>
      <motion.h1 {...fade(1)} className="hero-title text-5xl font-semibold leading-[1.06] sm:text-6xl">Your city.<br /><span className="text-forest">Your voice.</span><br /><span className="text-ember">Real change.</span></motion.h1>
      <motion.p {...fade(2)} className="mt-5 max-w-sm text-sm leading-relaxed text-ink/75 sm:text-base">For the streets we share and the places we call home. Report a civic issue. Follow its progress. Make a difference.</motion.p>
      <motion.div {...fade(3)} className="mt-6 flex flex-wrap gap-3"><Button asChild variant="forest" className="h-11 px-4 text-sm"><Link to="/report">Report an Issue <ArrowRight /></Link></Button><Button asChild variant="outline" className="h-11 px-4 text-sm"><Link to="/explore"><MapPin />Explore the City</Link></Button></motion.div>
      <motion.div {...fade(4)} className="mt-6 flex min-h-5 items-center gap-2 text-xs text-forest"><ShieldCheck className="h-4 w-4 shrink-0" /><motion.span key={current.label} initial={reduce?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.35}}>{current.detail}</motion.span></motion.div>
      <motion.div {...fade(5)} className="mt-5"><Button asChild variant="link" className="h-auto p-0 text-xs"><a href="#city-preview">Around your neighbourhood <ArrowDown /></a></Button></motion.div>
     </div>
     <div className="hero-reports absolute inset-0 hidden lg:block">{DEMO_ISSUES.slice(0,3).map((issue,i)=>{const c=getCategory(issue.category);return <motion.div key={issue.id} className={`hero-report hero-report-${i}`} style={{y:reduce?0:cardsY,rotate:reduce?0:cardRotate}}><motion.div {...fade(i+5)}><Link to="/explore" className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-paper/70 bg-paper/95 p-3 shadow-lift backdrop-blur-sm transition-transform hover:-translate-y-1"><span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-md',c.tone)}><c.icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold">{c.label}</p><p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-forest"><CheckCircle2 className="h-3 w-3" />{STATUS_LABEL[issue.status]}</p><p className="mt-1 text-[10px] text-muted-foreground">{issue.locality} · Sample report</p></div><ArrowUpRight className="h-3.5 w-3.5 text-forest" /></Link><span className="hero-pin mx-auto mt-2 grid h-7 w-7 place-items-center rounded-full border-2 border-paper bg-ember text-ember-foreground shadow-soft"><MapPin className="h-4 w-4" /></span></motion.div></motion.div>;})}</div>
     <div className="hero-timeline absolute bottom-5 left-6 right-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5 md:left-8 md:right-8 lg:left-0 lg:right-0">
      <div className="grid max-w-sm grid-cols-4 gap-2" aria-label="Opening city chapters">{chapters.map((c,i)=><Button key={c.label} variant="ghost" disabled={Boolean(reduce)} aria-label={`Scene ${i+1}: ${c.label}`} aria-pressed={chapter===i} onClick={()=>choose(i)} className={cn('h-auto flex-col items-start gap-2 rounded-none p-0 text-forest hover:bg-transparent disabled:opacity-100',chapter!==i&&'opacity-60')}><span className="relative h-0.5 w-full overflow-hidden bg-forest/15"><ChapterProgress progress={scrollYProgress} index={i} reduced={Boolean(reduce)} /></span><span className="flex items-center gap-1.5 text-[10px]"><c.icon className="h-3 w-3 shrink-0" /><span>{c.label}</span></span></Button>)}</div>
      <span className="hidden items-center gap-2 rounded-full border border-paper/70 bg-paper/90 px-3 py-2 text-[10px] text-forest shadow-soft sm:flex"><MapPin className="h-3.5 w-3.5" />Illustrated city · sample reports</span>
     </div>
    </div>
   </div>
   <a href="#city-preview" className="hero-next grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-y border-border bg-paper px-6 text-[11px] text-forest md:px-8"><span>A shared city. A thousand possibilities.</span><span className="flex items-center gap-2">Around the neighbourhood <ArrowDown className="h-3 w-3" /></span></a>
  </div>
 </section>;
}
