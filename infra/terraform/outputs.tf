output "api_url" {
  description = "API is accessed through CloudFront at /api (e.g. https://<cloudfront-domain>/api). Direct ALB URL: http://<alb-dns>"
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}/api"
}

output "cloudfront_url" {
  description = "CloudFront distribution URL for the frontend SPA"
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidations in CI/CD)"
  value       = aws_cloudfront_distribution.spa.id
}

output "ecr_repository_url" {
  description = "ECR repository URL for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for the frontend SPA"
  value       = aws_s3_bucket.spa.bucket
}

output "rds_endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name for the API"
  value       = aws_ecs_service.api.name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.api.dns_name
}

output "ecs_task_definition_family" {
  description = "ECS task definition family name (used by CI/CD to register new revisions)"
  value       = aws_ecs_task_definition.api.family
}

output "private_subnet_ids" {
  description = "JSON-encoded list of private subnet IDs (used by CI/CD for ECS run-task)"
  value       = jsonencode(aws_subnet.private[*].id)
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS tasks (used by CI/CD for ECS run-task)"
  value       = aws_security_group.ecs_tasks.id
}
