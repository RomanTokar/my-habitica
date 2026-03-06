variable "app_name" {
  description = "Application name, used as a prefix for all resources"
  type        = string
  default     = "my-habitica"
}

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "api_image" {
  description = "ECR image URI for the API container (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/my-habitica-api:latest)"
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:latest"
}

variable "api_cpu" {
  description = "ECS task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired number of ECS API task instances"
  type        = number
  default     = 1
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "habitica"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "habitica"
}

variable "frontend_url" {
  description = "Public URL of the frontend (used for CORS)"
  type        = string
}
