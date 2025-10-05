# maven-latest-resolver

A lightweight service that resolves the latest SNAPSHOT jar before sonatype/nexus  

## How it works

Example path: `/repository/maven-public/{groupId}/{artifactId}/{version}/{artifactId}-{version}.jar`

if `{version}` contains `-SNAPSHOT`,   
the resolver fetches:  
`/repository/maven-public/{groupId}/{artifactId}/{version}/maven-metadata.xml`  
then it finds the latest timestamped SNAPSHOT:  
`/repository/maven-public/{groupId}/{artifactId}/{version}/{artifactId}-{version}-{timestamp}-{buildNumber}.jar`  

if the request is **not for SNAPSHOT jars**, it returns 404, so sonatype/nexus can serve as a fallback.  

## How to (Deploy)

docker-compose.yml
```yaml
services:
  nexus:
    image: sonatype/nexus3 # https://hub.docker.com/r/sonatype/nexus3/
    container_name: nexus
    pull_policy: always
    restart: unless-stopped
    volumes:
      - nexus-data:/nexus-data

  maven-latest-resolver:
    image: ghcr.io/thespeedcubing/maven-latest-resolver
    container_name: maven-latest-resolver
    environment:
      REPO_URL_BASE: "http://nexus:8081"
    pull_policy: always
    restart: unless-stopped

  nexus-nginx:
    image: nginx:stable
    container_name: nexus-nginx
    networks:
      - common-network
    pull_policy: always
    restart: unless-stopped
    volumes:
      - ./mounts/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - nexus
      - maven-latest-resolver

volumes:
  nexus-data:
    name: nexus-data
    external: true

networks:
  common-network:
    external: true

```

Nginx Reverse Proxy
```conf
  server {
    listen 80 default_server;

    server_name _;

    location / {
        proxy_pass http://maven-latest-resolver;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 1s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
        proxy_intercept_errors on;
        error_page 404 = @nexus;
    }

    location @nexus {
        proxy_pass http://nexus:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 1s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
  }
```
