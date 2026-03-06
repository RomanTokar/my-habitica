# ---------------------------------------------------------------
# ECS Task Execution Role
# Used by the ECS agent to pull images and write logs.
# ---------------------------------------------------------------
resource "aws_iam_role" "ecs_task_execution" {
  name        = "${var.app_name}-ecs-task-execution-role"
  description = "Allows ECS tasks to call AWS services on your behalf (ECR, CloudWatch, Secrets Manager)"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-ecs-task-execution-role"
  }
}

# AWS managed policy for basic ECS task execution (ECR pull + CloudWatch logs)
resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Least-privilege inline policy for reading only the specific secrets this app needs
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.app_name}-ecs-secrets-read"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAppSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.db_password.arn
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------
# ECS Task Role
# Used by the application code itself for any AWS API calls.
# Start with minimal permissions; add as needed.
# ---------------------------------------------------------------
resource "aws_iam_role" "ecs_task" {
  name        = "${var.app_name}-ecs-task-role"
  description = "Runtime permissions for the ${var.app_name} API application"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-ecs-task-role"
  }
}

# Minimal inline policy for the task role (add S3, SQS, etc. as required)
resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.app_name}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSExec"
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}
