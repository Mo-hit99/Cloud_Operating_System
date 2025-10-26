pipeline {
    agent any
    
    parameters {
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Git branch to build')
        string(name: 'GIT_COMMIT', defaultValue: '', description: 'Git commit SHA')
        string(name: 'BUILD_NUMBER', defaultValue: '1', description: 'Build number from GitHub Actions')
        string(name: 'DOCKER_IMAGE_TAG', defaultValue: 'os-manager:latest', description: 'Docker image tag')
        string(name: 'DOCKERHUB_REPO', defaultValue: 'mohitkohli007/os-manager', description: 'DockerHub repository')
        choice(name: 'ENVIRONMENT', choices: ['staging', 'production'], description: 'Deployment environment')
    }
    
    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE = "${params.DOCKERHUB_REPO}"
        IMAGE_TAG = "${params.GIT_COMMIT ? params.GIT_COMMIT.take(8) : 'latest'}"
        APP_NAME = 'os-manager'
        NAMESPACE = "${params.ENVIRONMENT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    if (params.GIT_COMMIT) {
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: params.GIT_COMMIT]],
                            userRemoteConfigs: [[url: env.GIT_URL]]
                        ])
                    } else {
                        checkout scm
                    }
                }
            }
        }
        
        stage('Build Info') {
            steps {
                script {
                    echo "Building ${env.APP_NAME}"
                    echo "Branch: ${params.GIT_BRANCH}"
                    echo "Commit: ${params.GIT_COMMIT}"
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Docker Image: ${env.DOCKER_IMAGE}:${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image..."
                    sh """
                        docker build -t ${env.DOCKER_IMAGE}:${env.IMAGE_TAG} .
                        docker tag ${env.DOCKER_IMAGE}:${env.IMAGE_TAG} ${env.DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Push to DockerHub') {
            steps {
                script {
                    echo "Pushing to DockerHub..."
                    sh """
                        echo \$DOCKERHUB_CREDENTIALS_PSW | docker login -u \$DOCKERHUB_CREDENTIALS_USR --password-stdin
                        docker push ${env.DOCKER_IMAGE}:${env.IMAGE_TAG}
                        docker push ${env.DOCKER_IMAGE}:latest
                        docker logout
                        
                        # Verify the image was pushed successfully
                        echo "Verifying image push..."
                        docker pull ${env.DOCKER_IMAGE}:${env.IMAGE_TAG}
                        echo "Image ${env.DOCKER_IMAGE}:${env.IMAGE_TAG} verified on DockerHub"
                    """
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "Deploying to Kubernetes..."
                    
                    // Check kubectl connectivity first
                    sh """
                        echo "Testing kubectl connectivity..."
                        kubectl version --client
                        kubectl cluster-info
                        kubectl get nodes
                        kubectl config current-context
                        echo "Current user: \$(whoami)"
                        echo "Kubectl config: \$(kubectl config view --minify)"
                    """
                    
                    // Create namespace if it doesn't exist
                    sh """
                        echo "Creating namespace ${env.NAMESPACE}..."
                        kubectl create namespace ${env.NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        kubectl get namespaces
                    """
                    
                    // Create processed manifests directory
                    sh """
                        echo "Preparing Kubernetes manifests..."
                        mkdir -p k8s-processed
                        
                        # Process each manifest file
                        for file in k8s/*.yaml; do
                            filename=\$(basename "\$file")
                            echo "Processing \$filename..."
                            
                            sed -e 's|{{IMAGE_NAME}}|${env.DOCKER_IMAGE}:${env.IMAGE_TAG}|g' \\
                                -e 's|{{NAMESPACE}}|${env.NAMESPACE}|g' \\
                                -e 's|{{APP_NAME}}|${env.APP_NAME}|g' \\
                                "\$file" > "k8s-processed/\$filename"
                        done
                        
                        echo "Processed manifests:"
                        ls -la k8s-processed/
                        
                        echo "Sample processed manifest:"
                        head -20 k8s-processed/deployment.yaml
                    """
                    
                    // Apply manifests in order
                    sh """
                        echo "Applying Kubernetes manifests..."
                        
                        # Apply in specific order with error checking
                        echo "1. Applying namespace..."
                        kubectl apply -f k8s-processed/namespace.yaml || echo "Namespace apply failed"
                        
                        echo "2. Applying secrets..."
                        kubectl apply -f k8s-processed/secrets.yaml -n ${env.NAMESPACE} || echo "Secrets apply failed"
                        
                        echo "3. Applying PVC..."
                        kubectl apply -f k8s-processed/pvc.yaml -n ${env.NAMESPACE} || echo "PVC apply failed"
                        
                        echo "4. Applying deployments..."
                        kubectl apply -f k8s-processed/deployment.yaml -n ${env.NAMESPACE} || echo "Deployment apply failed"
                        
                        echo "5. Applying services..."
                        kubectl apply -f k8s-processed/service.yaml -n ${env.NAMESPACE} || echo "Service apply failed"
                        
                        echo "6. Creating NGINX configuration..."
                        # Get cluster IP for services
                        MAIN_APP_IP=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}')
                        UBUNTU_IP=\$(kubectl get service ubuntu-desktop-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}')
                        ALPINE_IP=\$(kubectl get service alpine-desktop-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}')
                        DEBIAN_IP=\$(kubectl get service debian-desktop-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}')
                        
                        # Create NGINX config
                        cat > /tmp/osmanager-nginx.conf << EOF
server {
    listen 80;
    server_name osmanager.test;
    location / {
        proxy_pass http://\$MAIN_APP_IP:5000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }
}

server {
    listen 80;
    server_name ubuntu.osmanager.test;
    location / {
        proxy_pass http://\$UBUNTU_IP:80;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }
}

server {
    listen 80;
    server_name alpine.osmanager.test;
    location / {
        proxy_pass http://\$ALPINE_IP:6080;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }
}

server {
    listen 80;
    server_name debian.osmanager.test;
    location / {
        proxy_pass http://\$DEBIAN_IP:5901;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }
}
EOF
                        
                        # Copy to nginx sites-available
                        sudo cp /tmp/osmanager-nginx.conf /etc/nginx/sites-available/osmanager
                        sudo ln -sf /etc/nginx/sites-available/osmanager /etc/nginx/sites-enabled/
                        sudo nginx -t && sudo systemctl reload nginx
                        
                        echo "NGINX configuration created and reloaded"
                        
                        echo "All manifests applied - checking status..."
                        kubectl get all -n ${env.NAMESPACE}
                        kubectl get ingress -n ${env.NAMESPACE}
                    """
                    
                    // Wait for deployment with better monitoring
                    sh """
                        echo "Waiting for deployment to be ready..."
                        
                        # Check if deployment exists
                        if kubectl get deployment ${env.APP_NAME} -n ${env.NAMESPACE}; then
                            echo "Deployment found, waiting for rollout..."
                            kubectl rollout status deployment/${env.APP_NAME} -n ${env.NAMESPACE} --timeout=600s
                            echo "Main app deployment completed"
                        else
                            echo "ERROR: Deployment ${env.APP_NAME} not found in namespace ${env.NAMESPACE}"
                            kubectl get deployments -n ${env.NAMESPACE}
                            exit 1
                        fi
                        
                        # Also wait for postgres and redis
                        echo "Checking postgres deployment..."
                        kubectl rollout status deployment/postgres -n ${env.NAMESPACE} --timeout=300s || echo "Postgres deployment timeout"
                        
                        echo "Checking redis deployment..."
                        kubectl rollout status deployment/redis -n ${env.NAMESPACE} --timeout=300s || echo "Redis deployment timeout"
                        
                        # Wait for desktop containers
                        echo "Checking Ubuntu desktop deployment..."
                        kubectl rollout status deployment/ubuntu-desktop -n ${env.NAMESPACE} --timeout=300s || echo "Ubuntu desktop deployment timeout"
                        
                        echo "Checking Alpine desktop deployment..."
                        kubectl rollout status deployment/alpine-desktop -n ${env.NAMESPACE} --timeout=300s || echo "Alpine desktop deployment timeout"
                        
                        echo "Checking Debian desktop deployment..."
                        kubectl rollout status deployment/debian-desktop -n ${env.NAMESPACE} --timeout=300s || echo "Debian desktop deployment timeout"
                        
                        echo "All deployments completed"
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "Verifying deployment..."
                    sh """
                        echo "=== DEPLOYMENT VERIFICATION ==="
                        
                        # Check all resources in namespace
                        echo "All resources in namespace ${env.NAMESPACE}:"
                        kubectl get all -n ${env.NAMESPACE}
                        
                        echo ""
                        echo "=== DEPLOYMENT DETAILS ==="
                        kubectl describe deployment ${env.APP_NAME} -n ${env.NAMESPACE} || echo "Deployment describe failed"
                        
                        echo ""
                        echo "=== POD STATUS ==="
                        kubectl get pods -n ${env.NAMESPACE} -o wide
                        
                        # Check pod logs if any pods exist
                        POD_NAME=\$(kubectl get pods -n ${env.NAMESPACE} -l app=${env.APP_NAME} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                        if [ ! -z "\$POD_NAME" ]; then
                            echo ""
                            echo "=== POD LOGS (last 50 lines) ==="
                            kubectl logs \$POD_NAME -n ${env.NAMESPACE} --tail=50 || echo "Could not get logs"
                        fi
                        
                        echo ""
                        echo "=== SERVICES ==="
                        kubectl get services -n ${env.NAMESPACE} -o wide
                        
                        # Get service URL
                        SERVICE_IP=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
                        SERVICE_PORT=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "5000")
                        
                        if [ -z "\$SERVICE_IP" ]; then
                            SERVICE_IP=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "localhost")
                        fi
                        
                        # Get Minikube/K8s IP for hosts file
                        K8S_IP=\$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "192.168.49.2")
                        
                        echo ""
                        echo "=== DEPLOYMENT SUMMARY ==="
                        echo "✅ Application: ${env.APP_NAME}"
                        echo "✅ Namespace: ${env.NAMESPACE}"
                        echo "✅ Image: ${env.DOCKER_IMAGE}:${env.IMAGE_TAG}"
                        echo "✅ Kubernetes IP: \$K8S_IP"
                        # Get Ubuntu server IP
                        UBUNTU_SERVER_IP=\$(hostname -I | awk '{print \$1}')
                        
                        echo ""
                        echo "🌐 ACCESS URLS (via NGINX on Ubuntu Server):"
                        echo "   Main App: http://osmanager.test"
                        echo "   Ubuntu Desktop: http://ubuntu.osmanager.test"
                        echo "   Alpine Desktop: http://alpine.osmanager.test"
                        echo "   Debian Desktop: http://debian.osmanager.test"
                        echo ""
                        echo "🔧 SETUP REQUIRED ON YOUR LOCAL MACHINE:"
                        echo "   Add to /etc/hosts (Linux/Mac) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows):"
                        echo "   \$UBUNTU_SERVER_IP    osmanager.test ubuntu.osmanager.test alpine.osmanager.test debian.osmanager.test"
                        echo ""
                        echo "📋 NGINX CONFIG CREATED:"
                        echo "   Config file: /etc/nginx/sites-available/osmanager"
                        echo "   NGINX status: \$(sudo systemctl is-active nginx)"
                        echo ""
                        echo "🔍 SERVICE IPs:"
                        echo "   Main App: \$MAIN_APP_IP:5000"
                        echo "   Ubuntu Desktop: \$UBUNTU_IP:80"
                        echo "   Alpine Desktop: \$ALPINE_IP:6080"
                        echo "   Debian Desktop: \$DEBIAN_IP:5901"
                        
                        # Store deployment info
                        echo "DEPLOYMENT_URL=http://\$SERVICE_IP:\$SERVICE_PORT" > deployment.properties
                        echo "NAMESPACE=${env.NAMESPACE}" >> deployment.properties
                        echo "APP_NAME=${env.APP_NAME}" >> deployment.properties
                        
                        echo ""
                        echo "=== NEXT STEPS ==="
                        echo "1. Check Kubernetes dashboard at: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"
                        echo "2. Port forward for local access: kubectl port-forward service/${env.APP_NAME}-service 5000:5000 -n ${env.NAMESPACE}"
                        echo "3. Check logs: kubectl logs -f deployment/${env.APP_NAME} -n ${env.NAMESPACE}"
                    """
                    
                    // Archive deployment properties
                    archiveArtifacts artifacts: 'deployment.properties', fingerprint: true
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Clean up processed files
                sh """
                    rm -rf k8s-processed || true
                """
                
                // Clean up Docker images (optional - comment out if you want to keep them)
                sh """
                    docker rmi ${env.DOCKER_IMAGE}:${env.IMAGE_TAG} || true
                    docker rmi ${env.DOCKER_IMAGE}:latest || true
                    docker system prune -f || true
                """
            }
        }
        
        success {
            echo "🎉 Pipeline completed successfully!"
            script {
                if (params.ENVIRONMENT == 'production') {
                    echo "🚀 Production deployment successful!"
                } else {
                    echo "✅ Staging deployment successful!"
                }
                
                // Show quick access commands
                echo """
                
=== QUICK ACCESS COMMANDS ===
kubectl get all -n ${env.NAMESPACE}
kubectl port-forward service/${env.APP_NAME}-service 5000:5000 -n ${env.NAMESPACE}
kubectl logs -f deployment/${env.APP_NAME} -n ${env.NAMESPACE}
                """
            }
        }
        
        failure {
            echo "❌ Pipeline failed!"
            script {
                echo "Deployment failed for ${params.ENVIRONMENT} environment"
                
                // Show debugging commands
                echo """
                
=== DEBUGGING COMMANDS ===
kubectl get all -n ${env.NAMESPACE}
kubectl describe deployment ${env.APP_NAME} -n ${env.NAMESPACE}
kubectl logs -f deployment/${env.APP_NAME} -n ${env.NAMESPACE}
kubectl get events -n ${env.NAMESPACE} --sort-by='.lastTimestamp'
                """
            }
        }
    }
}