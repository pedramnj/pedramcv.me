# Infrastructure as Code for this site's DNS (Cloudflare).
# `terraform plan` shows the exact diff before anything changes.
terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  # export CLOUDFLARE_API_TOKEN=... (scoped to Zone:DNS:Edit)
}

resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "pedramcv.me"
  type    = "A"
  content = var.origin_ip
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  type    = "CNAME"
  content = "pedramcv.me"
  proxied = true
  ttl     = 1
}

output "site_url" {
  value = "https://${cloudflare_record.root.name}"
}
