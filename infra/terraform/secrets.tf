# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.app_name}/${var.environment}/jwt-secret"
  description             = "JWT signing secret for ${var.app_name} API"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.app_name}-jwt-secret"
  }
}

# Generate a random JWT secret (managed by Terraform, like db_password)
resource "random_password" "jwt_secret" {
  length  = 64
  special = false # JWT secrets work best without special chars
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# DB Password Secret
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.app_name}/${var.environment}/db-password"
  description             = "PostgreSQL master password for ${var.app_name}"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.app_name}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id

  # Store as JSON so additional fields can be added later
  secret_string = jsonencode({
    password = random_password.db_password.result
    username = var.db_username
    dbname   = var.db_name
  })
}

# Generate a random DB password (managed by Terraform)
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Composite DATABASE_URL secret for easy injection into ECS task
resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${var.app_name}/${var.environment}/database-url"
  description             = "Full PostgreSQL connection string for ${var.app_name} API"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.app_name}-database-url"
  }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id

  # Populated after RDS is created; uses a local to compute the URL
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${var.db_name}"

  depends_on = [aws_db_instance.postgres]
}

