import { Globe, Mail, Phone, MapPin, Download, GraduationCap, Award } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons";
import { profile, skills, projects, certifications, languages } from "@/lib/content/profile";
import { Tag } from "@/components/ui/primitives";

export default function Footer() {
  return (
    <footer id="about" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 pt-8 sm:px-6">
      {/* About + skills */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <p className="mono-label mb-3">whoami</p>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{profile.name}</h2>
          <p className="mt-1 font-mono text-sm text-cyan">{profile.title}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{profile.summary}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-faint" /> {profile.location} · {profile.citizenship}</span>
            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 transition hover:text-cyan"><Mail className="h-4 w-4 text-faint" /> {profile.email}</a>
            <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 transition hover:text-cyan"><Phone className="h-4 w-4 text-faint" /> {profile.phone}</a>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-void transition hover:brightness-110">
              <Mail className="h-4 w-4" /> Get in touch
            </a>
            <a href={profile.links.cv} download className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-text transition hover:border-white/25">
              <Download className="h-4 w-4" /> Download CV
            </a>
            <a href={profile.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-cyan"><GithubIcon className="h-4 w-4" /></a>
            <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-cyan"><LinkedinIcon className="h-4 w-4" /></a>
            <a href={profile.links.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-cyan"><Globe className="h-4 w-4" /></a>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <p className="mono-label mb-4">technical skills</p>
          <div className="space-y-4">
            {skills.map((g) => (
              <div key={g.label}>
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">{g.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((s) => <Tag key={s}>{s}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {projects.map((p) => (
          <div key={p.name} className="glass flex flex-col rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-bold">{p.name}</h3>
              <span className="font-mono text-[10px] text-faint">{p.period}</span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-cyan">{p.role}</p>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{p.blurb}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.stack.slice(0, 6).map((s) => <Tag key={s}>{s}</Tag>)}
            </div>
          </div>
        ))}
      </div>

      {/* Certs + languages + colophon */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <p className="mono-label mb-3 inline-flex items-center gap-2"><Award className="h-3.5 w-3.5" /> certifications</p>
          <ul className="space-y-2">
            {certifications.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text">{c.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-faint">{c.issuer} · {c.year}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="mono-label mb-3 inline-flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> languages</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <span key={l.name} className="rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 text-sm">
                {l.name} <span className="font-mono text-[11px] text-cyan">{l.level}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-line/60 pt-6 text-center font-mono text-[11px] text-faint sm:flex-row sm:text-left">
        <span>© {new Date().getFullYear()} {profile.name} — built with Next.js, React Three Fiber & real CI.</span>
        <span>Static export · self-hosted on Hetzner · <span className="text-cyan">pedramcv.me</span></span>
      </div>
    </footer>
  );
}
