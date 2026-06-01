# Stage 1: Build application using Maven
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY ../java-backend/pom.xml .
COPY ../java-backend/src ./src

# Compile and package application bypassing test runs for build speed in CI
RUN mvn clean package -DskipTests

# Stage 2: Slim runtime container with non-root security configurations
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-privileged user and group
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy jar from builder phase
COPY --from=builder /app/target/card-manager-0.0.1-SNAPSHOT.jar app.jar

# JVM Tuning for containerized environments
ENV JAVA_OPTS="-XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
