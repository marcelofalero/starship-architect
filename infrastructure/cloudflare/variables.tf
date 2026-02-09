variable "cloudflare_api_token" {
  description = "The Cloudflare API Token."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "The Cloudflare Account ID."
  type        = string
}

variable "project_name" {
  description = "The name of the Cloudflare Pages project."
  type        = string
  default     = "starship-architect"
}

variable "github_owner" {
  description = "The GitHub owner of the repository."
  type        = string
}

variable "github_repo" {
  description = "The GitHub repository name."
  type        = string
}

variable "production_branch" {
  description = "The production branch name."
  type        = string
  default     = "main"
}

variable "custom_domain" {
  description = "The custom domain to associate with the Pages project."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "The Cloudflare Zone ID for the custom domain."
  type        = string
}
