# GitHub Secrets Setup Guide for CI/CD Pipeline - Trigger Jenkins

This guide helps you configure GitHub repository secrets for the automated CI/CD pipeline that triggers Jenkins builds for the OS Manager application.

## Workflow Overview

- **Triggers**: Push to `main`/`develop` branches, Pull requests to `main`, Manual dispatch
- **Environments**: Staging (default) and Production
- **Docker Image**: `os-manager`
- **Process**: GitHub Actions → Jenkins → DockerHub → Kubernetes

## Required GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. Jenkins Configuration

- **JENKINS_URL**: Your Jenkins server URL
  - Example: `http://192.168.1.100:8080`
  - Format: `http://IP_ADDRESS:PORT` (no trailing slash)
  - ⚠️ Make sure Jenkins is accessible from GitHub Actions (public IP or VPN)
- **JENKINS_USER**: Your Jenkins username
  - The user account that has permission to trigger builds
  - Must have "Build" permission on the target job
- **JENKINS_TOKEN**: Jenkins API token
  - Generate from: Jenkins → User Profile → Configure → API Token → Add new Token
  - Copy the generated token immediately (it won't be shown again)
- **JENKINS_JOB_NAME**: Name of your Jenkins pipeline job
  - Example: `os-manager-pipeline`
  - Must match EXACTLY the job name you create in Jenkins (case-sensitive)

### 2. DockerHub Configuration

- **DOCKERHUB_USERNAME**: Your DockerHub username
  - This will be used to create the image repository: `username/os-manager`
- **DOCKERHUB_PASSWORD**: Your DockerHub password or access token
  - Recommended: Use access token instead of password for security

## Jenkins Pipeline Job Configuration

### 1. Create Jenkins Pipeline Job

1. Go to Jenkins Dashboard → New Item
2. Enter name: `os-manager-pipeline` (must match JENKINS_JOB_NAME secret)
3. Select "Pipeline" → OK
4. Configure the job:
   - **Build Triggers**: Check "Trigger builds remotely" and set authentication token
   - **Pipeline Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: Your GitHub repository URL
   - **Branch Specifier**: `*/main` or `*/${GIT_BRANCH}`
   - **Script Path**: `Jenkinsfile`

### 2. Jenkins Credentials Setup

In your Jenkins server, configure these credentials:

#### DockerHub Credentials

- Go to Jenkins → Manage Jenkins → Manage Credentials → Global
- Add new Username/Password credential:
  - **ID**: `dockerhub-credentials`
  - **Username**: Your DockerHub username (same as DOCKERHUB_USERNAME secret)
  - **Password**: Your DockerHub password/token

#### Kubernetes Config

- Add new Secret file credential:
  - **ID**: `kubeconfig-file`
  - **File**: Upload your kubeconfig file (usually from `~/.kube/config`)

### 3. Jenkins Parameters

The pipeline expects these parameters (automatically passed from GitHub Actions):

- `GIT_BRANCH`: Branch being built (e.g., main, develop)
- `GIT_COMMIT`: Full commit SHA
- `BUILD_NUMBER`: GitHub Actions run number
- `DOCKER_IMAGE_TAG`: Complete image tag (os-manager:commit-sha)
- `DOCKERHUB_REPO`: Full DockerHub repository (username/os-manager)
- `ENVIRONMENT`: Deployment environment (staging/production)

## Ubuntu Server Setup

### 1. Install Required Tools

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker jenkins

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Kubernetes (if not already installed)
# For minikube:
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### 2. Start Kubernetes

```bash
# Start minikube (if using minikube)
minikube start --driver=docker

# Or if using a full Kubernetes cluster, ensure it's running
kubectl cluster-info
```

### 3. Configure Jenkins Job

Create a new Pipeline job in Jenkins with:

- Name: `os-manager-pipeline`
- Type: Pipeline
- Pipeline Definition: Pipeline script from SCM
- SCM: Git
- Repository URL: Your GitHub repository URL
- Script Path: `Jenkinsfile`

## Pipeline Workflow Steps

### Automatic Triggers

1. **Push to main/develop**: Automatically triggers pipeline
   - `main` branch → Production environment
   - `develop` branch → Staging environment
2. **Pull Request to main**: Triggers pipeline for testing
3. **Manual Dispatch**: Use GitHub Actions tab → "Run workflow" → Select environment

### Pipeline Process

1. **GitHub Actions**:

   - Checks out code
   - Sets environment variables (branch, commit SHA, build number)
   - Triggers Jenkins via API call
   - Waits for Jenkins build completion
   - Reports build status and deployment summary

2. **Jenkins Pipeline**:
   - Checks out specific commit
   - Builds Docker image with commit SHA tag
   - Pushes to DockerHub (`username/os-manager:commit-sha`)
   - Deploys to Kubernetes cluster
   - Verifies deployment health

### Environment Configuration

- **Staging**: Default environment, used for develop branch and manual testing
- **Production**: Used for main branch pushes and manual production deployments

## Testing the Pipeline

### First Time Setup Test

1. Push a small change to `develop` branch
2. Go to GitHub → Actions tab → Check "CI/CD Pipeline - Trigger Jenkins" workflow
3. Monitor the workflow progress
4. Check Jenkins dashboard for the triggered build
5. Verify deployment: `kubectl get pods -n staging`

### Manual Deployment Test

1. Go to GitHub → Actions → "CI/CD Pipeline - Trigger Jenkins"
2. Click "Run workflow"
3. Select environment (staging/production)
4. Click "Run workflow"

## Accessing Your Application

After successful deployment:

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n staging  # or -n production

# Check services
kubectl get services -n staging

# Get service URL
kubectl get service os-manager-service -n staging -o wide
```

### Access URLs

- **Application**: `http://your-ubuntu-server-ip:service-port`
- **Health Check**: `http://your-ubuntu-server-ip:service-port/api/health`

### Get Exact Service Port

```bash
# Get the external port
kubectl get service os-manager-service -n staging -o jsonpath='{.spec.ports[0].port}'

# If using NodePort, get the node port
kubectl get service os-manager-service -n staging -o jsonpath='{.spec.ports[0].nodePort}'
```

## Troubleshooting

### GitHub Actions Issues

#### Workflow Not Triggering

```bash
# Check if workflow file is in correct location
ls -la .github/workflows/ci-cd-pipeline.yml

# Verify branch names in workflow triggers
git branch -a
```

#### "URL rejected: Malformed input" Error

This error occurs when the curl command receives an invalid URL. Common causes:

1. **Empty or unset secrets**:
   - Check if all required secrets are set in GitHub repository settings
   - Missing secrets will result in empty variables in the URL

2. **JENKINS_URL format issues**:
   - ✅ Correct: `http://192.168.1.100:8080`
   - ❌ Wrong: `http://192.168.1.100:8080/` (trailing slash)
   - ❌ Wrong: `192.168.1.100:8080` (missing protocol)
   - ❌ Wrong: `http://jenkins server:8080` (spaces in URL)

3. **JENKINS_JOB_NAME issues**:
   - ✅ Correct: `os-manager-pipeline`
   - ❌ Wrong: `os manager pipeline` (spaces)
   - ❌ Wrong: Job name with special characters

#### Jenkins API Call Failures

- Verify JENKINS_URL format (no trailing slash, include http://)
- Check JENKINS_USER has API access permissions
- Regenerate JENKINS_TOKEN if authentication fails
- Ensure JENKINS_JOB_NAME matches exactly (case-sensitive)
- Test Jenkins API manually:
  ```bash
  curl -u "username:token" "http://your-jenkins:8080/api/json"
  ```

### Jenkins Pipeline Issues

#### Build Not Starting

```bash
# Check Jenkins job configuration
# Verify job name matches JENKINS_JOB_NAME secret
# Check if job accepts parameters
```

#### Docker Build Failures

```bash
# Check Jenkins console output
# Verify Docker daemon is running
sudo systemctl status docker

# Ensure Jenkins user is in docker group
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

#### DockerHub Push Failures

- Verify dockerhub-credentials in Jenkins
- Check DockerHub repository exists or can be created
- Ensure DockerHub username matches DOCKERHUB_USERNAME secret

### Kubernetes Deployment Issues

#### Pod Creation Failures

```bash
# Check pod status and events
kubectl get pods -n staging
kubectl describe pod <pod-name> -n staging

# Check deployment events
kubectl describe deployment os-manager -n staging
```

#### Image Pull Errors

```bash
# Verify image exists on DockerHub
docker pull <dockerhub-username>/os-manager:<tag>

# Check if image name/tag is correct in deployment
kubectl get deployment os-manager -n staging -o yaml | grep image
```

#### Service Access Issues

```bash
# Check service configuration
kubectl get service os-manager-service -n staging -o yaml

# Test internal connectivity
kubectl exec -it <pod-name> -n staging -- curl localhost:5000/api/health

# Check if LoadBalancer is working
kubectl get service os-manager-service -n staging
```

### Common Solutions

#### Reset Pipeline

```bash
# Delete and recreate namespace
kubectl delete namespace staging
kubectl create namespace staging

# Redeploy secrets
kubectl apply -f k8s/secrets.yaml -n staging
```

#### Jenkins Permissions

```bash
# Fix Docker permissions
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# Fix kubectl permissions
sudo cp ~/.kube/config /var/lib/jenkins/.kube/
sudo chown jenkins:jenkins /var/lib/jenkins/.kube/config
```

#### Debug Commands

```bash
# Check all resources in namespace
kubectl get all -n staging

# View recent events
kubectl get events -n staging --sort-by='.lastTimestamp'

# Check logs
kubectl logs -f deployment/os-manager -n staging
kubectl logs -f deployment/postgres -n staging
kubectl logs -f deployment/redis -n staging
```

### Monitoring and Logs

#### GitHub Actions Logs

- Go to GitHub → Actions → Select workflow run → View job logs

#### Jenkins Logs

- Jenkins Dashboard → Job Name → Build Number → Console Output

#### Application Logs

```bash
# Real-time logs
kubectl logs -f deployment/os-manager -n staging

# Previous container logs
kubectl logs deployment/os-manager -n staging --previous
```
