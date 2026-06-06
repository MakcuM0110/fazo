FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site1.html /usr/share/nginx/html/index.html
COPY admin.html /usr/share/nginx/html/admin.html
RUN mkdir -p /usr/share/nginx/html/uploads
EXPOSE 80
