"use client";

import { useState } from "react";
import type { ReactNode, ElementType } from "react";
import Link from "next/link";
import { useT } from "@/hooks/useT";
import {
  FileCode2, Play, Activity, BarChart3,
  Gauge, Clock, Users, AlertTriangle,
  Key, UserPlus, CheckCircle, XCircle,
  ArrowRight, ChevronRight, Info, AlertOctagon, Lightbulb,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

type YamlToken = { text: string; color?: string };
type YamlLine  = YamlToken[];

function YLine({ tokens }: { tokens: YamlLine }) {
  return (
    <div className="leading-5">
      {tokens.map((tok, i) => (
        <span key={i} className={tok.color ?? "text-zinc-300"}>{tok.text}</span>
      ))}
    </div>
  );
}

function CodePane({ lines, title }: { lines: YamlLine[]; title?: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden text-xs font-mono">
      {title && (
        <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="ml-1 text-zinc-500">{title}</span>
        </div>
      )}
      <div className="p-4 space-y-0 overflow-auto">{lines.map((l, i) => <YLine key={i} tokens={l} />)}</div>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
        <span className="h-px flex-1 bg-zinc-800" />{title}<span className="h-px flex-1 bg-zinc-800" />
      </h2>
      {children}
    </section>
  );
}

function MetricRow({ icon: Icon, color, name, desc }: {
  icon: ElementType; color: string; name: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 rounded-md p-1.5 ${color}`}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-sm font-medium text-zinc-200">{name}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function RoleBadge({ label, color, desc }: { label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function WorkflowStep({ num, icon: Icon, title, desc, href, color }: {
  num: number; icon: ElementType; title: string; desc: string; href: string; color: string;
}) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-3 text-center">
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${color} transition-transform group-hover:scale-105`}>
        <Icon className="h-7 w-7" />
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 ring-1 ring-zinc-700">
          {num}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500 max-w-[120px]">{desc}</p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab — mockups
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIO_LINES: YamlLine[] = [
  [{ text:"version: ", color:"text-zinc-500" },{ text:'"1"', color:"text-amber-400" }],
  [{ text:"name: ", color:"text-zinc-500" },{ text:"API Load Test", color:"text-zinc-200" }],
  [{ text:"config:", color:"text-blue-400" }],
  [{ text:"  virtualUsers: ", color:"text-zinc-500" },{ text:"50", color:"text-blue-300" },{ text:"  # eşzamanlı VU", color:"text-zinc-600" }],
  [{ text:"  duration: ", color:"text-zinc-500" },{ text:"5m", color:"text-emerald-400" },{ text:"  # toplam süre", color:"text-zinc-600" }],
  [{ text:"  rampUp: ", color:"text-zinc-500" },{ text:"60s", color:"text-amber-400" },{ text:"  # ısınma", color:"text-zinc-600" }],
  [{ text:"  targetRps: ", color:"text-zinc-500" },{ text:"0", color:"text-violet-400" }],
  [{ text:"" }],
  [{ text:"steps:", color:"text-blue-400" }],
  [{ text:"  - name: ", color:"text-zinc-500" },{ text:"GET /api/products", color:"text-zinc-200" }],
  [{ text:"    protocol: ", color:"text-zinc-500" },{ text:"http", color:"text-orange-400" }],
  [{ text:"    assertions:", color:"text-zinc-500" }],
  [{ text:"      - type: ", color:"text-zinc-500" },{ text:"statusCode", color:"text-emerald-400" }],
  [{ text:"        equals: ", color:"text-zinc-500" },{ text:"200", color:"text-blue-300" }],
  [{ text:"      - type: ", color:"text-zinc-500" },{ text:"responseTime", color:"text-orange-400" }],
  [{ text:"        lessThanMs: ", color:"text-zinc-500" },{ text:"500", color:"text-red-400" }],
];

function ScenarioMockup() {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden text-xs font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-zinc-500">scenario.yaml</span>
      </div>
      <div className="p-4 space-y-0.5">{SCENARIO_LINES.map((l,i)=><YLine key={i} tokens={l}/>)}</div>
    </div>
  );
}

function RunConfigMockup() {
  const rows = [
    { label:"Virtual Users", value:"50",     color:"text-blue-400"    },
    { label:"Duration",      value:"5 min",  color:"text-emerald-400" },
    { label:"Ramp-up",       value:"60 s",   color:"text-amber-400"   },
    { label:"Max P95",       value:"500 ms", color:"text-orange-400"  },
    { label:"Max Err%",      value:"1%",     color:"text-red-400"     },
  ];
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-xs text-zinc-400">Start Test Run</div>
      <div className="p-4 space-y-3">
        {rows.map(({label,value,color})=>(
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className={`text-sm font-semibold ${color}`}>{value}</span>
          </div>
        ))}
        <div className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-center text-xs font-semibold text-white">▶ Start Run</div>
      </div>
    </div>
  );
}

function LiveChartMockup() {
  const pts = [10,22,35,42,48,51,50,49,52,48,47,50,49];
  const W=220, H=80, max=60;
  const toX=(i:number)=>(i/(pts.length-1))*W;
  const toY=(v:number)=>H-(v/max)*H;
  const line=pts.map((v,i)=>`${i===0?"M":"L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  const area=`${line} L ${W} ${H} L 0 ${H} Z`;
  const pills=[{l:"P50",v:"42ms",c:"#22c55e"},{l:"P95",v:"180ms",c:"#f97316"},{l:"Err",v:"0.2%",c:"#71717a"}];
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-700 bg-zinc-800/60 px-4 py-2.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"/>
        <span className="text-xs text-zinc-400">Live · Requests per Second</span>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H+20}`} className="w-full">
          {([0,20,40,60] as number[]).map(v=>(
            <line key={v} x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="#27272a" strokeWidth="1" strokeDasharray="3 3"/>
          ))}
          <path d={area} fill="#3b82f6" fillOpacity={0.15}/>
          <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <text x={W-2} y={toY(pts[pts.length-1])-6} textAnchor="end" fill="#60a5fa" fontSize="10" fontWeight="bold">
            {pts[pts.length-1]} RPS
          </text>
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {pills.map(({l,v,c})=>(
            <div key={l} className="rounded-md bg-zinc-800 px-2 py-1.5">
              <p className="text-[10px] text-zinc-500">{l}</p>
              <p className="text-xs font-bold" style={{color:c}}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportMockup() {
  const tiles=[{k:"Avg RPS",v:"49.2",c:"text-blue-400"},{k:"P95",v:"194ms",c:"text-orange-400"},{k:"P99",v:"310ms",c:"text-red-400"},{k:"Errors",v:"0.18%",c:"text-zinc-400"}];
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-xs text-zinc-400">Final Report</div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-400"/>
          <span className="text-xs font-semibold text-emerald-400">Quality gate PASSED</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(({k,v,c})=>(
            <div key={k} className="rounded-md bg-zinc-800 p-2">
              <p className="text-[10px] text-zinc-500">{k}</p>
              <p className={`text-sm font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 200 40" className="w-full rounded-md bg-zinc-800 p-1">
          <polyline points="0,35 30,28 60,22 90,18 120,16 150,17 180,15 200,16" fill="none" stroke="#3b82f6" strokeWidth="2"/>
          <polyline points="0,38 30,37 60,36 90,37 120,38 150,37 180,37 200,38" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YAML tab components
// ─────────────────────────────────────────────────────────────────────────────

function ParamCard({ name, type, required, children, example }: {
  name: string; type: string; required: boolean; children: ReactNode; example: YamlLine[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-800/40 px-4 py-3">
        <code className="text-sm font-bold text-blue-400">{name}</code>
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase tracking-wide">{type}</span>
        {required
          ? <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-[10px] font-semibold text-red-400">Zorunlu</span>
          : <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Opsiyonel</span>
        }
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-mono space-y-0">
          {example.map((l,i)=><YLine key={i} tokens={l}/>)}
        </div>
      </div>
    </div>
  );
}

function TipBox({ type, children }: { type: "info"|"warn"|"ok"; children: ReactNode }) {
  const styles = {
    info: { border:"border-blue-800",   bg:"bg-blue-900/15",   icon: Info,          ic:"text-blue-400"   },
    warn: { border:"border-amber-800",  bg:"bg-amber-900/15",  icon: AlertOctagon,  ic:"text-amber-400"  },
    ok:   { border:"border-emerald-800",bg:"bg-emerald-900/15",icon: Lightbulb,     ic:"text-emerald-400"},
  }[type];
  const Icon = styles.icon;
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.ic}`}/>
      <div className={`text-xs leading-relaxed ${styles.ic}`}>{children}</div>
    </div>
  );
}

function AssertionCard({ typeName, field, fieldType, desc, example }: {
  typeName: string; field: string; fieldType: string; desc: string; example: YamlLine[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-800/40 px-4 py-3">
        <code className="text-sm font-bold text-violet-400">type: {typeName}</code>
        <span className="text-zinc-600">+</span>
        <code className="text-sm text-amber-400">{field}: <span className="text-zinc-400">{fieldType}</span></code>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-zinc-400">{desc}</p>
        <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-mono">
          {example.map((l,i)=><YLine key={i} tokens={l}/>)}
        </div>
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-bold text-zinc-100 mt-2">{children}</h3>;
}

// ─────────────────────────────────────────────────────────────────────────────
// YAML tab data
// ─────────────────────────────────────────────────────────────────────────────

const FULL_EXAMPLE: YamlLine[] = [
  [{ text:'version: ', color:'text-zinc-500' },{ text:'"1"', color:'text-amber-400' }],
  [{ text:'name: ', color:'text-zinc-500' },{ text:'Ürün API Yük Testi', color:'text-zinc-200' }],
  [{ text:'' }],
  [{ text:'config:', color:'text-blue-400' }],
  [{ text:'  virtualUsers: ', color:'text-zinc-500' },{ text:'50', color:'text-blue-300' }],
  [{ text:'  duration: ', color:'text-zinc-500' },{ text:'5m', color:'text-emerald-400' }],
  [{ text:'  rampUp: ', color:'text-zinc-500' },{ text:'60s', color:'text-amber-400' }],
  [{ text:'  targetRps: ', color:'text-zinc-500' },{ text:'0', color:'text-violet-400' }],
  [{ text:'' }],
  [{ text:'environments:', color:'text-blue-400' }],
  [{ text:'  default:', color:'text-zinc-400' }],
  [{ text:'    baseUrl: ', color:'text-zinc-500' },{ text:'https://api.example.com', color:'text-emerald-400' }],
  [{ text:'' }],
  [{ text:'steps:', color:'text-blue-400' }],
  [{ text:'  - name: ', color:'text-zinc-500' },{ text:'Ürünleri Listele', color:'text-zinc-200' }],
  [{ text:'    protocol: ', color:'text-zinc-500' },{ text:'http', color:'text-orange-400' }],
  [{ text:'    request:', color:'text-zinc-500' }],
  [{ text:'      method: ', color:'text-zinc-500' },{ text:'GET', color:'text-blue-300' }],
  [{ text:'      url: ', color:'text-zinc-500' },{ text:'/api/products', color:'text-amber-400' }],
  [{ text:'      timeoutMs: ', color:'text-zinc-500' },{ text:'8000', color:'text-violet-400' }],
  [{ text:'    assertions:', color:'text-zinc-500' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'statusCode', color:'text-emerald-400' }],
  [{ text:'        equals: ', color:'text-zinc-500' },{ text:'200', color:'text-blue-300' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'responseTime', color:'text-orange-400' }],
  [{ text:'        lessThanMs: ', color:'text-zinc-500' },{ text:'500', color:'text-red-400' }],
];

const POST_EXAMPLE: YamlLine[] = [
  [{ text:'steps:', color:'text-blue-400' }],
  [{ text:'  - name: ', color:'text-zinc-500' },{ text:'Kullanıcı Oluştur', color:'text-zinc-200' }],
  [{ text:'    protocol: ', color:'text-zinc-500' },{ text:'http', color:'text-orange-400' }],
  [{ text:'    request:', color:'text-zinc-500' }],
  [{ text:'      method: ', color:'text-zinc-500' },{ text:'POST', color:'text-emerald-400' }],
  [{ text:'      url: ', color:'text-zinc-500' },{ text:'/api/users', color:'text-amber-400' }],
  [{ text:'      headers:', color:'text-zinc-500' }],
  [{ text:'        Content-Type: ', color:'text-zinc-500' },{ text:'application/json', color:'text-amber-400' }],
  [{ text:'        Authorization: ', color:'text-zinc-500' },{ text:'Bearer my-token', color:'text-amber-400' }],
  [{ text:'      body: ', color:'text-zinc-500' },{ text:"|", color:'text-zinc-400' }],
  [{ text:'        {"name":"Test User","email":"test@example.com"}', color:'text-emerald-300' }],
  [{ text:'    assertions:', color:'text-zinc-500' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'statusCode', color:'text-emerald-400' }],
  [{ text:'        equals: ', color:'text-zinc-500' },{ text:'201', color:'text-blue-300' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'body', color:'text-violet-400' }],
  [{ text:'        contains: ', color:'text-zinc-500' },{ text:'"id"', color:'text-amber-400' }],
];

const MULTISTEP_EXAMPLE: YamlLine[] = [
  [{ text:'steps:', color:'text-blue-400' }],
  [{ text:'' }],
  [{ text:'  # Adım 1 — Auth token al', color:'text-zinc-600' }],
  [{ text:'  - name: ', color:'text-zinc-500' },{ text:'Login', color:'text-zinc-200' }],
  [{ text:'    protocol: ', color:'text-zinc-500' },{ text:'http', color:'text-orange-400' }],
  [{ text:'    request:', color:'text-zinc-500' }],
  [{ text:'      method: ', color:'text-zinc-500' },{ text:'POST', color:'text-emerald-400' }],
  [{ text:'      url: ', color:'text-zinc-500' },{ text:'/auth/login', color:'text-amber-400' }],
  [{ text:'      headers:', color:'text-zinc-500' }],
  [{ text:'        Content-Type: ', color:'text-zinc-500' },{ text:'application/json', color:'text-amber-400' }],
  [{ text:'      body: ', color:'text-zinc-500' },{ text:'|', color:'text-zinc-400' }],
  [{ text:'        {"email":"load@test.com","password":"test1234"}', color:'text-emerald-300' }],
  [{ text:'    assertions:', color:'text-zinc-500' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'statusCode', color:'text-emerald-400' }],
  [{ text:'        equals: ', color:'text-zinc-500' },{ text:'200', color:'text-blue-300' }],
  [{ text:'' }],
  [{ text:'  # Adım 2 — Korunan kaynağa eriş', color:'text-zinc-600' }],
  [{ text:'  - name: ', color:'text-zinc-500' },{ text:'Profili Getir', color:'text-zinc-200' }],
  [{ text:'    protocol: ', color:'text-zinc-500' },{ text:'http', color:'text-orange-400' }],
  [{ text:'    request:', color:'text-zinc-500' }],
  [{ text:'      method: ', color:'text-zinc-500' },{ text:'GET', color:'text-blue-300' }],
  [{ text:'      url: ', color:'text-zinc-500' },{ text:'/api/me', color:'text-amber-400' }],
  [{ text:'      headers:', color:'text-zinc-500' }],
  [{ text:'        Authorization: ', color:'text-zinc-500' },{ text:'Bearer static-token', color:'text-amber-400' }],
  [{ text:'    assertions:', color:'text-zinc-500' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'statusCode', color:'text-emerald-400' }],
  [{ text:'        equals: ', color:'text-zinc-500' },{ text:'200', color:'text-blue-300' }],
  [{ text:'      - type: ', color:'text-zinc-500' },{ text:'responseTime', color:'text-orange-400' }],
  [{ text:'        lessThanMs: ', color:'text-zinc-500' },{ text:'300', color:'text-red-400' }],
];

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ t }: { t: (k:string)=>string }) {
  const steps = [
    { num:1, icon:FileCode2, key:"step1", href:"/scenarios/new", color:"border-blue-800 bg-blue-900/20 text-blue-400" },
    { num:2, icon:Play,      key:"step2", href:"/scenarios",     color:"border-emerald-800 bg-emerald-900/20 text-emerald-400" },
    { num:3, icon:Activity,  key:"step3", href:"/runs",          color:"border-amber-800 bg-amber-900/20 text-amber-400" },
    { num:4, icon:BarChart3, key:"step4", href:"/reports",       color:"border-violet-800 bg-violet-900/20 text-violet-400" },
  ];
  const presets=[{id:"smoke",c:"text-emerald-400"},{id:"load",c:"text-blue-400"},{id:"stress",c:"text-orange-400"},{id:"spike",c:"text-red-400"},{id:"soak",c:"text-violet-400"},{id:"breakpoint",c:"text-rose-400"}];
  const liveM=[
    {icon:Gauge,color:"bg-blue-900/30 text-blue-400",name:"RPS",key:"guide.metrics.rps"},
    {icon:Clock,color:"bg-orange-900/30 text-orange-400",name:"P95",key:"guide.metrics.p95"},
    {icon:Clock,color:"bg-red-900/30 text-red-400",name:"P99",key:"guide.metrics.p99"},
    {icon:AlertTriangle,color:"bg-red-900/30 text-red-400",name:"Err%",key:"guide.metrics.err"},
    {icon:Users,color:"bg-violet-900/30 text-violet-400",name:"Active VUs",key:"guide.metrics.vu"},
  ];
  const metA=[
    {icon:Gauge,color:"bg-blue-900/30 text-blue-400",name:"RPS",key:"guide.metrics.rps"},
    {icon:Clock,color:"bg-emerald-900/30 text-emerald-400",name:"P50 — Medyan",key:"guide.metrics.p50"},
    {icon:Clock,color:"bg-orange-900/30 text-orange-400",name:"P95",key:"guide.metrics.p95"},
  ];
  const metB=[
    {icon:Clock,color:"bg-red-900/30 text-red-400",name:"P99",key:"guide.metrics.p99"},
    {icon:AlertTriangle,color:"bg-red-900/30 text-red-400",name:"Error Rate",key:"guide.metrics.err"},
    {icon:Users,color:"bg-violet-900/30 text-violet-400",name:"Active VUs",key:"guide.metrics.vu"},
  ];
  const roles=[
    {label:"Owner",color:"bg-amber-900/40 text-amber-400",key:"guide.team.owner"},
    {label:"Admin",color:"bg-blue-900/40 text-blue-400",key:"guide.team.admin"},
    {label:"Developer",color:"bg-green-900/40 text-green-400",key:"guide.team.developer"},
    {label:"Viewer",color:"bg-zinc-800 text-zinc-400",key:"guide.team.viewer"},
  ];
  const configRows=[
    {key:"virtualUsers",color:"text-blue-400",desc:"Eşzamanlı istek gönderen sanal kullanıcı sayısı."},
    {key:"duration",color:"text-emerald-400",desc:"Testin toplam çalışma süresi (60s, 5m, 1h)."},
    {key:"rampUp",color:"text-amber-400",desc:"VU sayısının sıfırdan hedefe doğrusal artış süresi."},
    {key:"maxP95Ms",color:"text-orange-400",desc:"P95 kalite kapısı — aşılırsa test başarısız sayılır."},
    {key:"maxErrorRate",color:"text-red-400",desc:"Hata oranı kapısı — aşılırsa test başarısız sayılır."},
  ];

  return (
    <div className="flex flex-col gap-14">
      <GuideSection title={`${t("guide.step")} by ${t("guide.step")}`}>
        <div className="flex items-start justify-between gap-2">
          {steps.map((s,i)=>(
            <div key={s.key} className="flex flex-1 items-start">
              <WorkflowStep num={s.num} icon={s.icon} title={t(`guide.${s.key}.title`)} desc={t(`guide.${s.key}.desc`)} href={s.href} color={s.color}/>
              {i<steps.length-1 && (
                <div className="mt-7 flex-1 flex items-center px-1">
                  <div className="h-px flex-1 border-t border-dashed border-zinc-700"/>
                  <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0"/>
                </div>
              )}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title={t("guide.step1.title")}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">{t("guide.step1.desc")} Senaryolar, testin nasıl çalışacağını tanımlayan YAML dosyalarıdır.</p>
            <div className="space-y-2">
              {presets.map(({id,c})=>(
                <div key={id} className="flex items-center gap-2 text-xs">
                  <ArrowRight className={`h-3 w-3 ${c} shrink-0`}/>
                  <span className={`font-semibold ${c}`}>{t(`preset.${id}`)}</span>
                  <span className="text-zinc-500">— {t(`testType.${id}.tagline`)}</span>
                </div>
              ))}
            </div>
            <Link href="/scenarios/new" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 w-fit">
              {t("scenarios.new.title")} <ArrowRight className="h-4 w-4"/>
            </Link>
          </div>
          <ScenarioMockup/>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.step2.title")}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RunConfigMockup/>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">{t("guide.step2.desc")}</p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              {configRows.map(({key,color,desc})=>(
                <div key={key} className="flex flex-col gap-0.5">
                  <span className={`font-mono text-xs font-semibold ${color}`}>{key}</span>
                  <span className="text-xs text-zinc-500 pl-2">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.step3.title")}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">{t("guide.step3.desc")} Grafikler 3 saniyede bir otomatik yenilenir.</p>
            <div className="space-y-3">{liveM.map(({icon,color,name,key})=><MetricRow key={name} icon={icon} color={color} name={name} desc={t(key)}/>)}</div>
          </div>
          <LiveChartMockup/>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.step4.title")}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ReportMockup/>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">{t("guide.step4.desc")}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0"/>
                <span className="text-xs text-emerald-400">Kalite kapısı GEÇTİ — tüm eşikler karşılandı.</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 px-3 py-2">
                <XCircle className="h-4 w-4 text-red-400 shrink-0"/>
                <span className="text-xs text-red-400">Kalite kapısı BAŞARISIZ — P95 eşiği aşıldı.</span>
              </div>
            </div>
            <Link href="/reports" className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 w-fit">
              {t("nav.reports")} <ArrowRight className="h-4 w-4"/>
            </Link>
          </div>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.metrics.title")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">{metA.map(({icon,color,name,key})=><MetricRow key={name} icon={icon} color={color} name={name} desc={t(key)}/>)}</div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">{metB.map(({icon,color,name,key})=><MetricRow key={name} icon={icon} color={color} name={name} desc={t(key)}/>)}</div>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.ci.title")}>
        <p className="text-sm text-zinc-400">{t("guide.ci.desc")}</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
            <div className="flex items-center gap-2"><Key className="h-4 w-4 text-amber-400"/><span className="text-sm font-semibold text-zinc-200">1. API Anahtarı Oluşturun</span></div>
            <p className="text-xs text-zinc-500">Ayarlar → API Anahtarları → Oluştur. Anahtarı yalnızca bir kez görürsünüz.</p>
            <div className="rounded-md bg-zinc-800 px-3 py-2 font-mono text-xs text-green-400 break-all">lf_AbCdEfGh1234567890xxxxx...</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
            <div className="flex items-center gap-2"><Play className="h-4 w-4 text-blue-400"/><span className="text-sm font-semibold text-zinc-200">2. CI Hattınızda Kullanın</span></div>
            <div className="rounded-md bg-zinc-800 p-3 text-xs font-mono text-zinc-300 space-y-0.5 overflow-auto">
              <div><span className="text-zinc-500"># GitHub Actions örneği</span></div>
              <div><span className="text-blue-400">- name:</span> <span className="text-amber-400">Run load test</span></div>
              <div><span className="text-blue-400">  run:</span> <span className="text-zinc-400">|</span></div>
              <div><span className="text-zinc-300">    curl -X POST \</span></div>
              <div><span className="text-zinc-300">      -H <span className="text-emerald-400">{'"'}X-Api-Key: {"${{ secrets.LF_KEY }}"}{'"'}</span> \</span></div>
              <div><span className="text-zinc-300">      https://loadforge.example.com/api/test-runs</span></div>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title={t("guide.team.title")}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2"><UserPlus className="h-4 w-4 text-zinc-400"/><span className="text-sm text-zinc-400">Ayarlar → Üyeler → Davet Et</span></div>
          {roles.map(({label,color,key})=><RoleBadge key={label} label={label} color={color} desc={t(key)}/>)}
        </div>
      </GuideSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YAML reference tab
// ─────────────────────────────────────────────────────────────────────────────

function YamlTab() {
  return (
    <div className="flex flex-col gap-14">

      {/* ── Giriş ── */}
      <GuideSection title="YAML ile Test Tanımlama">
        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
          LoadForge{"'"}da her test senaryosu bir <span className="text-blue-400 font-mono">YAML</span> dosyası olarak tanımlanır. YAML, okunması ve yazılması kolay, girintiye dayalı bir veri formatıdır. Senaryo dosyası dört ana bölümden oluşur:
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:"config",       color:"text-blue-400",   desc:"VU, süre, oran" },
            { label:"environments", color:"text-emerald-400",desc:"Base URL'ler"   },
            { label:"steps",        color:"text-orange-400", desc:"HTTP istekleri" },
            { label:"assertions",   color:"text-violet-400", desc:"Kalite kapıları"},
          ].map(({label,color,desc})=>(
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
              <code className={`text-sm font-bold ${color}`}>{label}</code>
              <p className="mt-1 text-xs text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
        <CodePane title="tam-ornek.yaml" lines={FULL_EXAMPLE}/>
        <TipBox type="info">
          <strong>YAML girintisi önemlidir.</strong> Her alt öğe 2 boşlukla girintilenmeli, sekme (Tab) kullanılmamalıdır. Editördeki kırmızı dalgalı çizgiler genellikle girinti hatalarına işaret eder.
        </TipBox>
      </GuideSection>

      {/* ── Kök alanlar ── */}
      <GuideSection title="Kök Alanlar">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParamCard name="version" type="string" required
            example={[[{text:'version: ',color:'text-zinc-500'},{text:'"1"',color:'text-amber-400'}]]}>
            Senaryo şema sürümü. Şu an yalnızca <code className="text-amber-400">{'"1"'}</code> geçerlidir. Her zaman tırnak içinde yazın.
          </ParamCard>
          <ParamCard name="name" type="string" required
            example={[[{text:'name: ',color:'text-zinc-500'},{text:'Login Stres Testi',color:'text-zinc-200'}]]}>
            Senaryonun okunabilir adı. Raporlarda, çalışma listesinde ve bildirimde kullanılır. Amacı açıkça anlatan, kısa bir ad seçin.
          </ParamCard>
        </div>
      </GuideSection>

      {/* ── config ── */}
      <GuideSection title="config — Yük Profili">
        <p className="text-sm text-zinc-400">Testin ne kadar sert ve ne kadar süre çalışacağını belirler.</p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParamCard name="virtualUsers" type="integer" required
            example={[
              [{text:'config:',color:'text-blue-400'}],
              [{text:'  virtualUsers: ',color:'text-zinc-500'},{text:'50',color:'text-blue-300'}],
            ]}>
            <p>Aynı anda sisteme istek gönderen <strong className="text-zinc-300">sanal kullanıcı (VU)</strong> sayısı. Her VU bağımsız bir browser/istemci gibi davranır.</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li><span className="text-emerald-400 font-semibold">Smoke:</span> 1–5 VU — minimum yük</li>
              <li><span className="text-blue-400 font-semibold">Load:</span> 25–200 VU — gerçekçi üretim</li>
              <li><span className="text-orange-400 font-semibold">Stress:</span> 200–500 VU — limit bulma</li>
              <li><span className="text-red-400 font-semibold">Spike:</span> 500–2000 VU — ani yük</li>
            </ul>
          </ParamCard>

          <ParamCard name="duration" type="string" required
            example={[
              [{text:'  duration: ',color:'text-zinc-500'},{text:'5m',color:'text-emerald-400'},{text:'   # 5 dakika',color:'text-zinc-600'}],
            ]}>
            <p>Testin toplam çalışma süresi. <strong className="text-zinc-300">rampUp süresi bu değere dahildir</strong> — örneğin 5m duration + 60s rampUp seçerseniz rampa 60s, stabil yük 4m sürer.</p>
            <div className="mt-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-mono space-y-1">
              {[["60s","60 saniye"],["5m","5 dakika"],["2h","2 saat"],["1h30m","1 saat 30 dakika"]].map(([v,d])=>(
                <div key={v} className="flex gap-3">
                  <span className="text-emerald-400 w-16">{v}</span>
                  <span className="text-zinc-500">{d}</span>
                </div>
              ))}
            </div>
          </ParamCard>

          <ParamCard name="rampUp" type="string" required={false}
            example={[
              [{text:'  rampUp: ',color:'text-zinc-500'},{text:'60s',color:'text-amber-400'},{text:'  # 0dan 50 VUya 60sde çık',color:'text-zinc-600'}],
            ]}>
            <p>VU sayısının <strong className="text-zinc-300">0&apos;dan hedef değere doğrusal olarak artış süresi</strong>. Sisteme ani yük bindirmeden önce ısınma sağlar. Varsayılan: <code className="text-amber-400">0s</code> (anında tam yük).</p>
            <div className="mt-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs space-y-0.5">
              <svg viewBox="0 0 200 50" className="w-full">
                <polyline points="0,48 60,5 200,5" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                <text x="2" y="48" fill="#71717a" fontSize="8">0 VU</text>
                <text x="170" y="12" fill="#71717a" fontSize="8">50 VU</text>
                <text x="24" y="42" fill="#f59e0b" fontSize="8">rampUp: 60s</text>
                <text x="100" y="20" fill="#71717a" fontSize="8">stabil</text>
              </svg>
            </div>
          </ParamCard>

          <ParamCard name="targetRps" type="integer" required={false}
            example={[
              [{text:'  targetRps: ',color:'text-zinc-500'},{text:'100',color:'text-violet-400'},{text:'  # maks 100 req/s',color:'text-zinc-600'}],
              [{text:'  # ya da:',color:'text-zinc-600'}],
              [{text:'  targetRps: ',color:'text-zinc-500'},{text:'0',color:'text-violet-400'},{text:'   # sınırsız (önerilen)',color:'text-zinc-600'}],
            ]}>
            <p>Tüm VU&apos;ların toplam olarak saniyede yapabileceği <strong className="text-zinc-300">maksimum istek sayısı</strong>. Sistemin kaldırabileceği gerçek kapasiteyi ölçmek istiyorsanız <code className="text-violet-400">0</code> bırakın (motor olabildiğince hızlı gönderir). Belirli bir RPS değerini aşmamak istiyorsanız pozitif bir tam sayı girin.</p>
          </ParamCard>
        </div>
        <TipBox type="ok">
          <strong>İpucu:</strong> Çoğu durumda <code className="text-violet-400">targetRps: 0</code> bırakmak doğrudur. RPS sınırı genellikle yapay kısıtlama yaratır; gerçek performans testi sistemin doğal limitini bulmayı hedefler.
        </TipBox>
      </GuideSection>

      {/* ── environments ── */}
      <GuideSection title="environments — Ortam Yapılandırması">
        <p className="text-sm text-zinc-400">Farklı sunucu adreslerini (staging, prod, local) isim vererek tanımlayın. Step URL&apos;leri bu taban adrese göre çözümlenir.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParamCard name="environments.<isim>" type="object" required
            example={[
              [{text:'environments:',color:'text-blue-400'}],
              [{text:'  default:',color:'text-zinc-400'}],
              [{text:'    baseUrl: ',color:'text-zinc-500'},{text:'https://api.example.com',color:'text-emerald-400'}],
              [{text:'  staging:',color:'text-zinc-400'}],
              [{text:'    baseUrl: ',color:'text-zinc-500'},{text:'https://staging.api.example.com',color:'text-emerald-400'}],
            ]}>
            <p>En az bir ortam (genellikle <code className="text-zinc-300">default</code>) tanımlanmalıdır. Birden fazla ortam tanımlayabilirsiniz; test başlatırken hangisini kullanacağınızı seçersiniz.</p>
          </ParamCard>
          <ParamCard name="baseUrl" type="string" required
            example={[
              [{text:'    baseUrl: ',color:'text-zinc-500'},{text:'https://api.example.com',color:'text-emerald-400'}],
            ]}>
            <p>Step&apos;lerdeki <code className="text-amber-400">url</code> alanının önüne eklenir. <strong className="text-zinc-300">Sonda / olmamalıdır.</strong> Step URL&apos;leri <code className="text-amber-400">/</code> ile başlamalıdır.</p>
            <div className="mt-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-mono">
              <div className="text-zinc-500">baseUrl: https://api.example.com</div>
              <div className="text-zinc-500">url: /products</div>
              <div className="text-zinc-400 mt-1">→ <span className="text-emerald-400">https://api.example.com/products</span></div>
            </div>
          </ParamCard>
        </div>
        <TipBox type="warn">
          <strong>Dikkat:</strong> baseUrl sonunda <code className="text-amber-400">/</code> bırakmayın ve step url&apos;ini <code className="text-amber-400">/</code> ile başlatın. Aksi hâlde URL birleştirmesi hatalı olur: <code className="text-red-400">https://api.example.com//products</code>
        </TipBox>
      </GuideSection>

      {/* ── steps ── */}
      <GuideSection title="steps — HTTP İstek Adımları">
        <p className="text-sm text-zinc-400">Her step, tüm VU&apos;ların döngüsel olarak çalıştırdığı bir HTTP isteğini tanımlar. Birden fazla step varsa VU&apos;lar sırayla hepsini çalıştırır.</p>

        <SubHeading>steps[].name</SubHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParamCard name="name" type="string" required
            example={[[{text:'  - name: ',color:'text-zinc-500'},{text:'Ürün Listesini Getir',color:'text-zinc-200'}]]}>
            Adımın açıklayıcı ismi. Metrik görselleştirmesinde ve hata mesajlarında bu isim görünür. Kısa ve amacı anlatan bir ad seçin.
          </ParamCard>
          <ParamCard name="protocol" type="string" required
            example={[[{text:'    protocol: ',color:'text-zinc-500'},{text:'http',color:'text-orange-400'}]]}>
            <p>Kullanılacak protokol. Şu an yalnızca <code className="text-orange-400">http</code> desteklenir. gRPC ve WebSocket desteği yol haritasında yer almaktadır.</p>
          </ParamCard>
        </div>

        <SubHeading>steps[].request — İstek Ayrıntıları</SubHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParamCard name="request.method" type="string" required
            example={[[{text:'      method: ',color:'text-zinc-500'},{text:'GET',color:'text-blue-300'}]]}>
            <p>HTTP metodu. Geçerli değerler:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["GET","POST","PUT","PATCH","DELETE","HEAD"].map(m=>(
                <code key={m} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-blue-300">{m}</code>
              ))}
            </div>
          </ParamCard>

          <ParamCard name="request.url" type="string" required
            example={[
              [{text:'      url: ',color:'text-zinc-500'},{text:'/api/products',color:'text-amber-400'}],
              [{text:'      # ya da tam URL:',color:'text-zinc-600'}],
              [{text:'      url: ',color:'text-zinc-500'},{text:'https://cdn.example.com/img.jpg',color:'text-amber-400'}],
            ]}>
            Endpoint yolu. <strong className="text-zinc-300">baseUrl&apos;e göreli</strong> olmalı ve <code className="text-amber-400">/</code> ile başlamalıdır. Tam URL de verilebilir; bu durumda baseUrl yok sayılır.
          </ParamCard>

          <ParamCard name="request.headers" type="map" required={false}
            example={[
              [{text:'      headers:',color:'text-zinc-500'}],
              [{text:'        Content-Type: ',color:'text-zinc-500'},{text:'application/json',color:'text-amber-400'}],
              [{text:'        Authorization: ',color:'text-zinc-500'},{text:'Bearer my-static-token',color:'text-amber-400'}],
              [{text:'        X-App-Version: ',color:'text-zinc-500'},{text:'"2.1.0"',color:'text-amber-400'}],
            ]}>
            <p>İsteğe eklenecek HTTP başlıkları. <code className="text-amber-400">Content-Type</code>, <code className="text-amber-400">Authorization</code>, <code className="text-amber-400">Accept</code> gibi standart başlıkların yanı sıra özel başlıklar da eklenebilir.</p>
          </ParamCard>

          <ParamCard name="request.body" type="string" required={false}
            example={[
              [{text:'      body: ',color:'text-zinc-500'},{text:'|',color:'text-zinc-400'}],
              [{text:'        {"email":"user@test.com","password":"test1234"}',color:'text-emerald-300'}],
            ]}>
            <p>İstek gövdesi (POST/PUT/PATCH için). <code className="text-zinc-400">|</code> (literal block) notasyonuyla çok satırlı JSON veya text yazılabilir. JSON gönderirken <code className="text-amber-400">Content-Type: application/json</code> başlığı eklemeyi unutmayın.</p>
          </ParamCard>

          <ParamCard name="request.timeoutMs" type="integer" required={false}
            example={[
              [{text:'      timeoutMs: ',color:'text-zinc-500'},{text:'8000',color:'text-violet-400'},{text:'  # 8 saniye',color:'text-zinc-600'}],
            ]}>
            <p>İstek zaman aşımı milisaniye cinsinden. Varsayılan: <code className="text-violet-400">10000</code> (10 saniye). Bu süreyi aşan istekler hata olarak sayılır ve yanıt süresi bu değer üzerinden kaydedilir.</p>
          </ParamCard>
        </div>
        <TipBox type="info">
          <strong>Statik token:</strong> LoadForge şu an dinamik değişken (login → token → next step) desteği sunmamaktadır. Kimlik doğrulama gerektiren testlerde <strong>statik bir test token&apos;ı</strong> oluşturup <code className="text-amber-400">Authorization</code> başlığına yazın. Dinamik token desteği yol haritasında yer almaktadır.
        </TipBox>
      </GuideSection>

      {/* ── assertions ── */}
      <GuideSection title="assertions — Kalite Kapıları">
        <p className="text-sm text-zinc-400 max-w-3xl">
          Her step&apos;e bir veya birden fazla assertion (doğrulama) ekleyebilirsiniz. Assertion koşullarından biri ihlal edildiğinde, istek <strong className="text-zinc-300">hata</strong> olarak işaretlenir ve hata oranı yükselir. Hata oranı veya P95 eşiğini aşarsa kalite kapısı <span className="text-red-400 font-semibold">BAŞARISIZ</span> olur.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <AssertionCard
            typeName="statusCode"
            field="equals"
            fieldType="integer"
            desc="HTTP yanıt durum kodunu kontrol eder. Beklenen kod gelmezse istek hata sayılır. En sık kullanılan assertion türüdür."
            example={[
              [{text:'    assertions:',color:'text-zinc-500'}],
              [{text:'      - type: ',color:'text-zinc-500'},{text:'statusCode',color:'text-emerald-400'}],
              [{text:'        equals: ',color:'text-zinc-500'},{text:'200',color:'text-blue-300'}],
              [{text:'      # ya da 201, 204, 302...',color:'text-zinc-600'}],
            ]}
          />
          <AssertionCard
            typeName="responseTime"
            field="lessThanMs"
            fieldType="integer"
            desc="İsteğin P95 yanıt süresini kontrol eder. Bu eşiği aşan her istek hata olarak işaretlenir. Kalite kapısı için birincil metriktir."
            example={[
              [{text:'      - type: ',color:'text-zinc-500'},{text:'responseTime',color:'text-orange-400'}],
              [{text:'        lessThanMs: ',color:'text-zinc-500'},{text:'500',color:'text-red-400'}],
              [{text:'      # ms cinsinden eşik',color:'text-zinc-600'}],
            ]}
          />
          <AssertionCard
            typeName="body"
            field="contains"
            fieldType="string"
            desc='Yanıt gövdesinin (response body) belirli bir metni içerip içermediğini kontrol eder. JSON alanı varlığını veya belirli bir değeri doğrulamak için kullanılır.'
            example={[
              [{text:'      - type: ',color:'text-zinc-500'},{text:'body',color:'text-violet-400'}],
              [{text:'        contains: ',color:'text-zinc-500'},{text:'"id"',color:'text-amber-400'}],
              [{text:'      # ya da:',color:'text-zinc-600'}],
              [{text:'        contains: ',color:'text-zinc-500'},{text:'"success":true',color:'text-amber-400'}],
            ]}
          />
        </div>
        <TipBox type="ok">
          <strong>Öneri:</strong> Her step&apos;e en az bir <code className="text-emerald-400">statusCode</code> ve bir <code className="text-orange-400">responseTime</code> assertion&apos;ı ekleyin. statusCode hatayı anında yakalar; responseTime ise kalite kapısını belirler.
        </TipBox>
      </GuideSection>

      {/* ── Örnekler ── */}
      <GuideSection title="Tam Örnek Senaryolar">

        <SubHeading>1 — Basit GET testi (Smoke)</SubHeading>
        <p className="text-sm text-zinc-500 -mt-2">Bir endpoint&apos;in ayakta olup olmadığını doğrulamak için minimum yapılandırma.</p>
        <CodePane title="smoke-test.yaml" lines={[
          [{text:'version: ',color:'text-zinc-500'},{text:'"1"',color:'text-amber-400'}],
          [{text:'name: ',color:'text-zinc-500'},{text:'Ana Sayfa Smoke Testi',color:'text-zinc-200'}],
          [{text:'config:',color:'text-blue-400'}],
          [{text:'  virtualUsers: ',color:'text-zinc-500'},{text:'2',color:'text-blue-300'}],
          [{text:'  duration: ',color:'text-zinc-500'},{text:'60s',color:'text-emerald-400'}],
          [{text:'  rampUp: ',color:'text-zinc-500'},{text:'0s',color:'text-amber-400'}],
          [{text:'environments:',color:'text-blue-400'}],
          [{text:'  default:',color:'text-zinc-400'}],
          [{text:'    baseUrl: ',color:'text-zinc-500'},{text:'https://api.example.com',color:'text-emerald-400'}],
          [{text:'steps:',color:'text-blue-400'}],
          [{text:'  - name: ',color:'text-zinc-500'},{text:'Health Check',color:'text-zinc-200'}],
          [{text:'    protocol: ',color:'text-zinc-500'},{text:'http',color:'text-orange-400'}],
          [{text:'    request:',color:'text-zinc-500'}],
          [{text:'      method: ',color:'text-zinc-500'},{text:'GET',color:'text-blue-300'}],
          [{text:'      url: ',color:'text-zinc-500'},{text:'/health',color:'text-amber-400'}],
          [{text:'    assertions:',color:'text-zinc-500'}],
          [{text:'      - type: ',color:'text-zinc-500'},{text:'statusCode',color:'text-emerald-400'}],
          [{text:'        equals: ',color:'text-zinc-500'},{text:'200',color:'text-blue-300'}],
          [{text:'      - type: ',color:'text-zinc-500'},{text:'responseTime',color:'text-orange-400'}],
          [{text:'        lessThanMs: ',color:'text-zinc-500'},{text:'200',color:'text-red-400'}],
        ]}/>

        <SubHeading>2 — POST isteği (kullanıcı oluşturma)</SubHeading>
        <p className="text-sm text-zinc-500 -mt-2">JSON body ve Authorization başlığı ile bir kaynak oluşturma isteği.</p>
        <CodePane title="post-test.yaml" lines={POST_EXAMPLE}/>

        <SubHeading>3 — Çoklu adım (login → korunan kaynak)</SubHeading>
        <p className="text-sm text-zinc-500 -mt-2">Birden fazla step tanımlandığında her VU sırayla tüm adımları çalıştırır.</p>
        <CodePane title="multistep.yaml" lines={MULTISTEP_EXAMPLE}/>
      </GuideSection>

      {/* ── Sık hatalar ── */}
      <GuideSection title="Sık Yapılan Hatalar">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            {
              title: "virtualUsers: 0 vermek",
              bad:  [[{text:"  virtualUsers: ",color:"text-zinc-500"},{text:"0",color:"text-red-400"}]],
              fix:  "1 veya daha büyük bir tam sayı olmalıdır.",
              type: "warn" as const,
            },
            {
              title: "duration formatını yanlış yazmak",
              bad:  [[{text:"  duration: ",color:"text-zinc-500"},{text:"300",color:"text-red-400"},{text:"  # geçersiz!",color:"text-red-800"}]],
              fix:  'Birim zorunludur: "300s" veya "5m".',
              type: "warn" as const,
            },
            {
              title: "url başında / olmadan yazmak",
              bad:  [[{text:"      url: ",color:"text-zinc-500"},{text:"api/products",color:"text-red-400"},{text:"  # hatalı",color:"text-red-800"}]],
              fix:  'url: /api/products şeklinde / ile başlamalı.',
              type: "warn" as const,
            },
            {
              title: "Content-Type olmadan JSON body göndermek",
              bad:  [[{text:"      body: ",color:"text-zinc-500"},{text:'|',color:"text-zinc-400"}],[{text:'        {"key":"val"}',color:"text-zinc-400"}]],
              fix:  "Content-Type: application/json başlığını headers'a ekleyin.",
              type: "warn" as const,
            },
            {
              title: "baseUrl sonuna / eklemek",
              bad:  [[{text:"    baseUrl: ",color:"text-zinc-500"},{text:"https://api.example.com/",color:"text-red-400"}]],
              fix:  "baseUrl sonunda / olmamalı; step url'i / ile başlamalı.",
              type: "warn" as const,
            },
            {
              title: "YAML girintisinde sekme (Tab) kullanmak",
              bad:  [[{text:"\t  virtualUsers: 50",color:"text-red-400"},{text:"  # Tab ile girintili!",color:"text-red-800"}]],
              fix:  "YAML yalnızca boşluk (space) kullanır. Editörde Tab→Boşluk ayarını yapın.",
              type: "warn" as const,
            },
          ].map(({title,bad,fix})=>(
            <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="border-b border-zinc-800 bg-zinc-800/40 px-4 py-2.5">
                <span className="text-sm font-semibold text-zinc-200">{title}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2 text-xs font-mono">
                  {bad.map((l,i)=><YLine key={i} tokens={l}/>)}
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-emerald-400 shrink-0"/>
                  <p className="text-xs text-zinc-400">{fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell — tab nav
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const t = useT();
  const [tab, setTab] = useState<"overview"|"yaml">("overview");

  const tabs = [
    { id:"overview" as const, label: t("nav.guide") + " — " + t("guide.subtitle").split(" ").slice(0,3).join(" ") + "…" },
    { id:"yaml"     as const, label: "YAML Referansı" },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">{t("guide.title")}</h1>
        <p className="mt-2 text-base text-zinc-400">{t("guide.subtitle")}</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t transition-colors ${
              tab === id
                ? "border-b-2 border-blue-500 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" ? <OverviewTab t={t} /> : <YamlTab />}
    </div>
  );
}
