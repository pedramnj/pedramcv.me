/**
 * Identity / CV data. Single source of truth for everything personal on the
 * site — edit here and it flows everywhere. Kept intentionally small: the star
 * of the site is the interactive pipeline, not a long résumé.
 */

export const profile = {
  name: "Pedram Nikjooy",
  title: "Cloud & DevOps Engineer",
  tagline: "I build cloud-native systems — and this site lets you run one.",
  location: "Torino, Italy",
  citizenship: "EU citizen",
  email: "p_nikjooy@yahoo.com",
  phone: "+39 331 272 4715",
  cert: "AWS Certified Cloud Practitioner — CLF-C02",
  links: {
    github: "https://github.com/pedramnj",
    linkedin: "https://www.linkedin.com/in/pedram-nikjooy",
    website: "https://pedramnikjooy.me",
    cv: "/Pedram-Nikjooy-CV.pdf",
  },
  summary:
    "M.Sc. Computer Engineering (Cloud Computing) from Politecnico di Torino, focused on cloud-native infrastructure, Kubernetes, and applied AI. I build production-grade platforms end to end — Docker, Kubernetes, CI/CD, MLOps, and GenAI agents — with hands-on Linux and cloud experience.",
} as const;

export type SkillGroup = { label: string; items: string[] };

export const skills: SkillGroup[] = [
  { label: "Cloud & Infra", items: ["AWS", "Hetzner", "S3", "Multi-Cloud", "Cloud-Native"] },
  { label: "Containers & Orchestration", items: ["Kubernetes", "Docker", "Docker Compose", "k3s", "Helm"] },
  { label: "CI/CD · IaC · MLOps", items: ["GitHub Actions", "CI/CD Pipelines", "Terraform", "IaC", "MLflow", "Git"] },
  { label: "Languages & Backend", items: ["Python", "SQL", "Bash", "Linux", "FastAPI", "Celery", "Redis"] },
  { label: "Data & Monitoring", items: ["PostgreSQL", "TimescaleDB", "Prometheus", "Grafana", "Alertmanager", "Nginx"] },
  { label: "GenAI & ML", items: ["LLM Agents", "MCP", "Ollama / Groq", "Gradient Boosting", "NumPy / Pandas"] },
];

export type Project = {
  name: string;
  role: string;
  period: string;
  blurb: string;
  stack: string[];
  href?: string;
};

export const projects: Project[] = [
  {
    name: "AutoSage",
    role: "M.Sc. Thesis · Politecnico di Torino",
    period: "2025 – 2026",
    blurb:
      "An LLM-driven predictive autoscaler for Kubernetes that pairs LLM reasoning with TOPSIS multi-criteria analysis to choose HPA vs VPA on live clusters. Cut cost per SLA-met request by 28–47% vs native HPA across 240+ trials, with a fault-tolerant LLM cascade (Qwen/Ollama → Groq → deterministic rules).",
    stack: ["Python", "Kubernetes / k3s", "Ollama", "Groq", "MCP", "FastAPI"],
  },
  {
    name: "STRYX",
    role: "Founder & Technical Lead · I3P Incubator",
    period: "2025 – Present",
    blurb:
      "An AI platform that turns instrumented buildings into autonomous structural inspectors — classifying each as Safe / Restricted / Unsafe within minutes of a seismic event. I architect and operate the full cloud-native stack and a production ML pipeline reaching 0.97 macro-F1.",
    stack: ["FastAPI", "PostgreSQL / TimescaleDB", "Celery / Redis", "S3", "Docker", "CI/CD"],
  },
  {
    name: "PeDax",
    role: "Independent Project",
    period: "2026 – Present",
    blurb:
      "A production-hardened, multi-symbol ML trading platform: real-time market-data ingest, walk-forward ML with calibrated probabilities, a per-asset risk engine, and paper/live execution with shadow validation — deployed on Hetzner with full observability.",
    stack: ["Python / FastAPI", "Next.js 15", "PostgreSQL", "Docker Compose", "GitHub Actions", "Prometheus / Grafana", "MLflow"],
  },
];

export const education = [
  {
    degree: "M.Sc. Computer Engineering — Cloud Computing",
    school: "Politecnico di Torino",
    period: "2022 – Jul 2026",
    note: "Thesis: AutoSage — LLM-driven predictive autoscaler for Kubernetes.",
  },
  {
    degree: "B.Sc. Software Engineering",
    school: "IAU-TNB, Tehran",
    period: "2014 – 2018",
  },
];

export const experience = [
  {
    role: "Technical Support Engineer — Hosting (L1 → L2)",
    org: "IRANHOST · Tehran",
    period: "Oct 2019 – Dec 2021",
    points: [
      "Administered and monitored Linux web/hosting servers for high availability.",
      "Configured DNS, email, and web services across multi-tenant environments.",
      "Implemented security hardening, patching, and audits.",
    ],
  },
];

export const certifications = [
  { name: "AWS Certified Cloud Practitioner (CLF-C02)", issuer: "Amazon Web Services", year: "2026" },
  { name: "Meta Front-End Developer", issuer: "Meta", year: "2024" },
  { name: "Technical Support Fundamentals", issuer: "Google", year: "2024" },
];

export const languages = [
  { name: "Persian", level: "Native" },
  { name: "English", level: "C2" },
  { name: "Italian", level: "B1" },
];
