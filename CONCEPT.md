# Concept

## The metaphor

A cloud-native delivery lifecycle **is** a pipeline — a series of stages that a change flows
through, from a commit to production and back via observability. So the site renders that pipeline
literally: a network of **3D glass tubes** carrying **glowing liquid**. Every action a visitor
takes pushes liquid further along; a failure stops the flow and turns it red.

Liquid colour doubles as a semantic channel:

| Colour | Meaning |
|--------|---------|
| cyan | data / flow |
| emerald | success / security gate |
| violet | compute / orchestration |
| magenta | provisioning / IaC |
| amber | cost / signals |
| red | failure |

## Why "you can run it" matters

The brief was explicit: not a portfolio that *describes* skills, but a place where a visitor is
**creative and then sees real execution**. So the centrepiece is a CI gate that runs the visitor's
own code for real — the rest of the pipeline reacts to that genuine pass/fail. Seeing your broken
test halt the liquid at CI is far more convincing than any bullet point.

## Mapping to AWS Cloud Practitioner (CLF-C02)

Each station ties back to an exam domain, so the playground also works as a study artifact:

- **Git / CI** → automation, security gates, reliability (Domains 1 & 2).
- **Docker / Kubernetes** → compute, containers, elasticity, high availability (Domain 3).
- **Terraform** → Infrastructure as Code; predictable, reviewable provisioning (Domains 3 & 4).
- **Prometheus / Grafana** → observability, SLOs, the Well-Architected feedback loop (Domain 1).

## Design language

Dark "control-room" aesthetic: a deep void background with a dot grid, glassmorphic panels, neon
liquid, and a mono/`Space Grotesk` type pairing. The 3D is the hero; the console below is where the
interaction deepens. The whole thing is meant to feel like operating a real system, not reading a
résumé.
