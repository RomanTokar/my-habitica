# S3 Bucket for SPA static files
resource "aws_s3_bucket" "spa" {
  bucket = "${var.app_name}-spa-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.app_name}-spa"
  }
}

# Block all public access - CloudFront will access via OAC
resource "aws_s3_bucket_public_access_block" "spa" {
  bucket = aws_s3_bucket.spa.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "spa" {
  bucket = aws_s3_bucket.spa.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Control (OAC) - successor to OAI
resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${var.app_name}-spa-oac"
  description                       = "OAC for ${var.app_name} SPA S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function: strip /api prefix before forwarding to ALB
resource "aws_cloudfront_function" "api_rewrite" {
  name    = "${var.app_name}-api-rewrite"
  runtime = "cloudfront-js-2.0"
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      request.uri = request.uri.replace(/^\/api/, '') || '/';
      return request;
    }
  EOF
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "spa" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe only - lower cost
  comment             = "${var.app_name} SPA distribution"

  origin {
    domain_name              = aws_s3_bucket.spa.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.spa.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "ALB-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # ALB only has HTTP listener
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Route /api/* to ALB (must come before default_cache_behavior)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # CachingDisabled — API responses must not be cached
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    # AllViewerExceptHostHeader — forwards cookies (JWT), query strings, and headers
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_rewrite.arn
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.spa.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # AWS Managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: serve index.html for 403/404 responses (S3 returns 403 for missing objects)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.app_name}-spa"
  }
}

# S3 Bucket Policy: allow CloudFront OAC to read objects
resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.spa.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.spa.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.spa]
}
