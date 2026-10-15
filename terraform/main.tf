# Terraform config for inspecting and operating Cloudflare from your machine.
# CI/CD deploys through wrangler, so Actions never runs this.
#
# Usage:
#   cd worker && npm run build          # produces dist/index.js
#   cd ../terraform
#   cp terraform.tfvars.example terraform.tfvars   # set account_id
#   export CLOUDFLARE_API_TOKEN=...
#   terraform init && terraform apply

terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Reads the CLOUDFLARE_API_TOKEN environment variable
provider "cloudflare" {}

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

locals {
  script = "${path.module}/../worker/dist/index.js"
}

# shortcut: keep this in sync with worker/wrangler.jsonc by hand; changing one side drifts
resource "cloudflare_workers_script" "check_prog" {
  account_id  = var.account_id
  script_name = "check-prog"

  content_file       = local.script
  content_sha256     = filesha256(local.script)
  main_module        = "index.js"
  compatibility_date = "2025-01-01"

  assets = {
    directory = "${path.module}/../worker/public"
  }

  bindings = [{
    type       = "durable_object_namespace"
    name       = "CLASSROOM"
    class_name = "Classroom"
  }]

  migrations = {
    new_tag            = "v1"
    new_sqlite_classes = ["Classroom"]
  }

  # Keep the SEATMAP_SECRET that was set with wrangler secret put
  keep_bindings = ["secret_text"]
}
