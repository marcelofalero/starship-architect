terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_pages_project" "swse_architect" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = var.production_branch
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "all"
      preview_branch_includes       = ["*"]
      preview_branch_excludes       = [var.production_branch]
    }
  }

  build_config {
    build_command   = ""
    destination_dir = "public"
    root_dir        = ""
  }
}

data "cloudflare_zone" "this" {
  zone_id = var.cloudflare_zone_id
}

resource "cloudflare_pages_domain" "custom_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.swse_architect.name
  domain       = var.custom_domain
}

resource "cloudflare_record" "custom_domain" {
  zone_id = var.cloudflare_zone_id
  name    = var.custom_domain == data.cloudflare_zone.this.name ? "@" : replace(var.custom_domain, "/\\.${data.cloudflare_zone.this.name}$/", "")
  type    = "CNAME"
  value   = cloudflare_pages_project.swse_architect.subdomain
  proxied = true
}
