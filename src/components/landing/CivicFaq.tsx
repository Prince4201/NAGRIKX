import { Link } from '@tanstack/react-router';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/site/Reveal';
const QUESTIONS = [
 ['What can I report?', 'Public-space problems such as potholes, uncollected garbage, broken streetlights, water leaks and blocked drains. Select the closest category and describe the location clearly.'],
 ['Do I need to upload a photograph?', 'Photographs are optional. A clear image helps explain the issue, but you can continue with a detailed description and location. Avoid including faces or personal information.'],
 ['Can I see reports near me?', 'Explore the illustrative city map or list, search a locality, and filter by category or status. Current examples are sample reports, not live civic records.'],
 ['Are reports being saved right now?', 'Yes. All submitted civic reports, photographs, and status workflows are saved securely to the NAGRIKX database in real time.'],
];
export function CivicFaq(){return <section className="border-y border-border bg-paper px-6 py-16 md:py-24"><div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Reveal><MessageCircle className="mb-5 h-7 w-7 text-ember" /><p className="eyebrow text-forest">A little clarity</p><h2 className="mt-4 text-3xl leading-tight md:text-4xl">Good questions.<br /><em className="text-forest">Clear answers.</em></h2><Button asChild variant="link" className="mt-5 p-0"><Link to="/how-it-works">More about NAGRIKX <ArrowUpRight /></Link></Button></Reveal><Reveal><Accordion type="single" collapsible>{QUESTIONS.map(([q,a],i)=><AccordionItem key={q} value={String(i)}><AccordionTrigger className="gap-4 py-5 text-base">{q}</AccordionTrigger><AccordionContent className="max-w-xl leading-relaxed text-muted-foreground">{a}</AccordionContent></AccordionItem>)}</Accordion></Reveal></div></section>}
