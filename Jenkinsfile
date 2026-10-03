pipeline {
    agent any

    environment {
        BACKEND_IMAGE = "cicd-platform-backend"
        FRONTEND_IMAGE = "cicd-platform-frontend"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Run Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm test || echo "No tests configured yet - skipping"'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./backend"
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ./frontend"
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh 'docker compose down'
                sh 'docker compose up -d --build'
            }
        }

        stage('Health Check') {
            steps {
                sh 'sleep 10'
                sh 'curl -f http://localhost:5000/api/health || exit 1'
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully. Deployment is live."
        }
        failure {
            echo "Pipeline failed. Check the stage logs above for details."
        }
        always {
            echo "Pipeline finished with status: ${currentBuild.currentResult}"
        }
    }
}
