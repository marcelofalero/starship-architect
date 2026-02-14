terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  # Assumes AWS credentials are provided via environment variables or default profile
  region = "us-east-1"
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

resource "cloudflare_pages_domain" "custom_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.swse_architect.name
  domain       = var.custom_domain
}

resource "aws_route53_record" "custom_domain" {
  zone_id = var.aws_route53_zone_id
  name    = var.custom_domain
  type    = "CNAME"
  ttl     = 300
  records = [cloudflare_pages_project.swse_architect.subdomain]
}

resource "cloudflare_d1_database" "swse_db" {
  account_id = var.cloudflare_account_id
  name       = "swse-db"
}

resource "cloudflare_worker_script" "swse_backend" {
  account_id          = var.cloudflare_account_id
  name                = "swse-backend"
  content             = file("${path.module}/../../backend/main.py")
  module              = true
  compatibility_date  = "2024-04-01"
  compatibility_flags = ["python_workers"]

  # Note: Python workers with dependencies (cf-requirements.txt) typically require
  # deployment via `wrangler` to bundle the environment.
  # This Terraform resource defines the script but may not fully support
  # dependency resolution without external build steps or using `wrangler deploy`.

  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.swse_db.id
  }

  secret_text_binding {
    name = "GOOGLE_CLIENT_ID"
    text = var.google_client_id
  }

  secret_text_binding {
    name = "SESSION_SECRET"
    text = var.session_secret
  }
}
