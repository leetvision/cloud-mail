## GitHub Actions Deployment

### 1. Configure GitHub Secrets

Open **Settings → Secrets and variables → Actions** in the repository and add:

| Name | Required | Description |
| --- | :---: | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token with edit access to Workers Scripts, D1, KV, and the resources used by the project |
| `JWT_SECRET` | ✅ | Random value of at least 32 characters used to sign authentication tokens |
| `INIT_SECRET` | ✅ | Random value of at least 32 characters, different from `JWT_SECRET`, used for database migrations |
| `LINUXDO_CLIENT_SECRET` | ❌ | Required when LinuxDO OAuth is enabled |
| `RESEND_WEBHOOK_SECRET` | ❌ | Resend signature secret required when the Resend webhook is enabled |

Do not store these values in `wrangler.jsonc`, repository variables, or source code. The workflow passes them to Wrangler through a temporary secrets file during deployment.

Generate separate `JWT_SECRET` and `INIT_SECRET` values with:

```bash
openssl rand -base64 48
```

### 2. Configure GitHub Variables

Open **Settings → Secrets and variables → Actions → Variables** and add:

| Name | Required | Description |
| --- | :---: | --- |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `DOMAIN` | ✅ | JSON array, for example `["mail.example.com"]` |
| `ADMIN` | ✅ | Administrator email, for example `admin@mail.example.com` |
| `D1_DATABASE_ID` | ❌ | Existing D1 ID; when omitted, the workflow finds or creates a database using `NAME` |
| `KV_NAMESPACE_ID` | ❌ | Existing KV namespace ID; when omitted, the workflow finds or creates a namespace using `NAME` |
| `R2_BUCKET_NAME` | ❌ | Existing bucket name when using R2; when omitted, the application uses KV for object storage |
| `CUSTOM_DOMAIN` | ❌ | Worker custom domain, for example `mail.example.com` |
| `NAME` | ❌ | Worker and automatically created resource name; defaults to `cloud-mail` |
| `PROJECT_LINK` | ❌ | Whether to display the project link in the interface |
| `AI_MODEL` | ❌ | Workers AI model |
| `ANALYSIS_CACHE` | ❌ | Whether to enable analytics caching |
| `CF_EMAIL` | ❌ | Set to `true` to enable the Cloudflare Email Sending binding |
| `LINUXDO_CLIENT_ID` | ❌ | LinuxDO OAuth client ID |
| `LINUXDO_CALLBACK_URL` | ❌ | OAuth callback URL; it must match the application login URL |
| `LINUXDO_SWITCH` | ❌ | Whether to display LinuxDO sign-in |

### 3. Deploy

Run **Deploy cloud-mail to Cloudflare Workers** from the Actions page. The workflow will:

1. Install dependencies with frozen lockfiles.
2. Build the frontend and run tests.
3. Bind or create D1 and KV resources.
4. Deploy the Worker with Cloudflare secrets.
5. Run idempotent database migrations through `POST /api/init` with the `x-init-secret` header.

To run migrations manually, keep the secret out of the URL:

```bash
curl --request POST \
  --header "x-init-secret: $INIT_SECRET" \
  https://mail.example.com/api/init
```

After deployment, configure Email Routing in the Cloudflare dashboard and route the destination domain to this Worker. When using Resend, set the webhook URL to `https://mail.example.com/api/webhooks` and configure the matching `RESEND_WEBHOOK_SECRET`.

Keep attachments private by leaving public access disabled on the R2 bucket and avoiding public R2 or S3 attachment URLs. The application reads objects through `/api/oss/*`, which validates either an authenticated session or a short-lived email-view token.
