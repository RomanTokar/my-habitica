# Bootstrap

One-time setup to create the S3 bucket and DynamoDB table for Terraform remote state.
Run this **once** before the first deploy, then never again.

```bash
cd infra/bootstrap
terraform init
terraform apply
```

After `apply` completes, the `infra/terraform` backend is already configured to use
these resources — just push to `main` and let the pipeline handle everything else.

The local `.tfstate` files produced here are gitignored. Keep them on disk (or back
them up manually) — losing them only means you can't manage the bootstrap resources
via Terraform, which is rarely needed.
