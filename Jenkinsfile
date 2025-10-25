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
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
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
                    """
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo "Deploying to Kubernetes..."
                    
                    // Create namespace if it doesn't exist
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
                        kubectl create namespace ${env.NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                    """
                    
                    // Apply Kubernetes manifests
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
                        
                        # Replace placeholders in k8s manifests
                        sed -i 's|{{IMAGE_NAME}}|${env.DOCKER_IMAGE}:${env.IMAGE_TAG}|g' k8s/*.yaml
                        sed -i 's|{{NAMESPACE}}|${env.NAMESPACE}|g' k8s/*.yaml
                        sed -i 's|{{APP_NAME}}|${env.APP_NAME}|g' k8s/*.yaml
                        
                        # Apply manifests
                        kubectl apply -f k8s/ -n ${env.NAMESPACE}
                        
                        # Wait for deployment to be ready
                        kubectl rollout status deployment/${env.APP_NAME} -n ${env.NAMESPACE} --timeout=300s
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "Verifying deployment..."
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
                        
                        # Get deployment status
                        kubectl get deployments -n ${env.NAMESPACE}
                        kubectl get pods -n ${env.NAMESPACE}
                        kubectl get services -n ${env.NAMESPACE}
                        
                        # Get service URL
                        SERVICE_IP=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
                        SERVICE_PORT=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.spec.ports[0].port}')
                        
                        if [ -z "\$SERVICE_IP" ]; then
                            SERVICE_IP=\$(kubectl get service ${env.APP_NAME}-service -n ${env.NAMESPACE} -o jsonpath='{.spec.clusterIP}')
                        fi
                        
                        echo "Application deployed successfully!"
                        echo "Access URL: http://\$SERVICE_IP:\$SERVICE_PORT"
                        
                        # Store deployment info for GitHub Actions
                        echo "DEPLOYMENT_URL=http://\$SERVICE_IP:\$SERVICE_PORT" > deployment.properties
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
                // Clean up Docker images
                sh """
                    docker rmi ${env.DOCKER_IMAGE}:${env.IMAGE_TAG} || true
                    docker rmi ${env.DOCKER_IMAGE}:latest || true
                    docker system prune -f
                """
            }
        }
        
        success {
            echo "Pipeline completed successfully!"
            script {
                // Send success notification (optional)
                if (params.ENVIRONMENT == 'production') {
                    echo "Production deployment successful!"
                }
            }
        }
        
        failure {
            echo "Pipeline failed!"
            script {
                // Send failure notification (optional)
                echo "Deployment failed for ${params.ENVIRONMENT} environment"
            }
        }
    }
}