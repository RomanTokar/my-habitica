# DB Subnet Group (uses private subnets)
resource "aws_db_subnet_group" "postgres" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

# Security Group for RDS - allows inbound 5432 only from ECS tasks
resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "Allow PostgreSQL access from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${var.app_name}-postgres"

  # Engine
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.db_instance_class

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  # Credentials - pulled from Secrets Manager
  db_name  = var.db_name
  username = var.db_username
  password = jsondecode(aws_secretsmanager_secret_version.db_password.secret_string)["password"]

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Availability - single AZ to minimize cost
  multi_az = false

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Snapshots — protect against accidental deletion
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.app_name}-postgres-final-snapshot"
  delete_automated_backups  = false
  deletion_protection       = false

  # Performance Insights (free tier)
  performance_insights_enabled = false

  # Parameter group defaults are fine for PostgreSQL 16
  parameter_group_name = "default.postgres16"

  tags = {
    Name = "${var.app_name}-postgres"
  }

  depends_on = [aws_secretsmanager_secret_version.db_password]
}
