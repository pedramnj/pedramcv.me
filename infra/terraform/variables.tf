variable "zone_id" {
  description = "Cloudflare Zone ID for pedramcv.me"
  type        = string
}

variable "origin_ip" {
  description = "Public IPv4 of the origin server"
  type        = string
  default     = "46.225.157.97"
}
