import { Globe, Download } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons";
import { profile } from "@/lib/content/profile";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <div className="glass flex items-center gap-3 rounded-full px-4 py-2">
          <span className="font-display text-sm font-semibold tracking-tight">{profile.name}</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted sm:inline">
            / {profile.title}
          </span>
        </div>

        <nav className="glass ml-auto flex items-center gap-1 rounded-full px-2 py-1.5">
          <a href={profile.links.github} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-cyan" aria-label="GitHub">
            <GithubIcon className="h-4 w-4" />
          </a>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-cyan" aria-label="LinkedIn">
            <LinkedinIcon className="h-4 w-4" />
          </a>
          <a href={profile.links.website} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-cyan" aria-label="Website">
            <Globe className="h-4 w-4" />
          </a>
          <a href={profile.links.cv} download className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 font-mono text-[11px] text-text transition hover:bg-white/10">
            <Download className="h-3.5 w-3.5" /> CV
          </a>
        </nav>
      </div>
    </header>
  );
}
