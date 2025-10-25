# Quick Setup Checklist for CI/CD Pipeline

## ✅ Step-by-Step Setup Guide

### 1. Configure GitHub Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 5 required secrets:

| Secret Name          | Example Value               | Description                                 |
| -------------------- | --------------------------- | ------------------------------------------- |
| `JENKINS_URL`        | `http://192.168.1.100:8080` | Your Jenkins server URL (no trailing slash) |
| `JENKINS_USER`       | `admin`                     | Your Jenkins username                       |
| `JENKINS_TOKEN`      | `11abc123def456...`         | Jenkins API token                           |
| `JENKINS_JOB_NAME`   | `os-manager-pipeline`       | Exact Jenkins job name                      |
| `DOCKERHUB_USERNAME` | `yourusername`              | Your DockerHub username                     |

### 2. Generate Jenkins API Token

1. Log into Jenkins → Click your username (top right)
2. Click **Configure** → Scroll to **API Token** section
3. Click **Add new Token** → Give it a name → **Generate**
4. **Copy the token immediately** (you won't see it again!)
5. Use this token as `JENKINS_TOKEN` secret

### 3. Create Jenkins Pipeline Job

1. Jenkins Dashboard → **New Item**
2. Name: `os-manager-pipeline` (must match `JENKINS_JOB_NAME`)
3. Select **Pipeline** → **OK**
4. **Configure the job**:

   **General Section**:
   - ✅ Check **"This project is parameterized"**
   - Add these **String Parameters**:
     | Parameter Name | Default Value | Description |
     |----------------|---------------|-------------|
     | `GIT_BRANCH` | `main` | Git branch to build |
     | `GIT_COMMIT` | `` | Git commit SHA (leave empty) |
     | `BUILD_NUMBER` | `1` | Build number from GitHub |
     | `DOCKER_IMAGE_TAG` | `os-manager:latest` | Docker image tag |
     | `DOCKERHUB_REPO` | `your-username/os-manager` | DockerHub repository |
     | `ENVIRONMENT` | `staging` | Deployment environment |

   **Pipeline Section**:
   - **Pipeline Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: Your GitHub repo URL
   - **Branch Specifier**: `*/${GIT_BRANCH}` (uses parameter)
   - **Script Path**: `Jenkinsfile`

5. **Save**

### 4. Setup Jenkins Credentials

In Jenkins → **Manage Jenkins** → **Manage Credentials** → **Global**:

1. **DockerHub Credentials**:

   - Type: Username with password
   - ID: `dockerhub-credentials`
   - Username: Your DockerHub username
   - Password: Your DockerHub password/token

2. **Kubernetes Config**:
   - Type: Secret file
   - ID: `kubeconfig-file`
   - File: Upload your `~/.kube/config` file

### 5. Verify Setup

After configuring all secrets, test the pipeline:

1. Push a change to `develop` branch, or
2. Go to **Actions** → **CI/CD Pipeline - Trigger Jenkins** → **Run workflow**

The workflow will now pass the validation step and trigger Jenkins!

## 🔍 Quick Verification

Check if secrets are properly set:

- Go to your repo → **Settings** → **Secrets and variables** → **Actions**
- You should see all 5 secrets listed (values are hidden for security)

## 🚨 Common Issues & Solutions

### HTTP 400: "Job is not parameterized"
**Problem**: `Error 400 *** is not parameterized`
**Cause**: Jenkins job doesn't accept parameters

**Solution**: Configure your Jenkins job to accept parameters:

1. **Go to Jenkins job**: `http://your-jenkins:8080/job/os-manager-pipeline/configure`
2. **Check "This project is parameterized"**
3. **Add String Parameters** (click "Add Parameter" → "String Parameter"):
   ```
   Name: GIT_BRANCH          Default: main
   Name: GIT_COMMIT          Default: (leave empty)
   Name: BUILD_NUMBER        Default: 1
   Name: DOCKER_IMAGE_TAG    Default: os-manager:latest
   Name: DOCKERHUB_REPO      Default: your-username/os-manager
   Name: ENVIRONMENT         Default: staging
   ```
4. **Update Branch Specifier**: Change from `*/main` to `*/${GIT_BRANCH}`
5. **Save** the configuration

### Exit Code 28 (Connection Timeout)

**Problem**: `Process completed with exit code 28`
**Cause**: GitHub Actions cannot reach your Jenkins server

**Solutions**:

1. **Make Jenkins publicly accessible**:

   ```bash
   # Check if Jenkins is running
   sudo systemctl status jenkins

   # Check firewall (Ubuntu/Debian)
   sudo ufw allow 8080
   sudo ufw status

   # Check if port is open
   netstat -tlnp | grep 8080
   ```

2. **Use public IP or domain**:

   - ❌ Wrong: `http://192.168.1.100:8080` (private IP)
   - ✅ Correct: `http://your-public-ip:8080`
   - ✅ Correct: `http://your-domain.com:8080`

3. **Router/Firewall Configuration**:
   - Forward port 8080 to your Jenkins server
   - Allow external access to port 8080

### Other Common Issues

- **JENKINS_URL**: Must include `http://` and no trailing `/`sss
- **JENKINS_JOB_NAME**: Must match exactly (case-sensitive)
- **Jenkins Access**: Ensure Jenkins is accessible from GitHub (public IP or proper networking)
- **Permissions**: Jenkins user must have build permissions on the job

### Quick Network Test

Test if your Jenkins is accessible externally:

```bash
# From another machine/network:
curl -I http://your-public-ip:8080

# Should return HTTP 200 or redirect, not timeout
```

## 📋 Next Steps After Setup

1. The pipeline will automatically trigger on pushes to `main`/`develop`
2. Check **Actions** tab for workflow progress
3. Monitor Jenkins for build execution
4. Access deployed app at `http://your-server-ip:service-port`
