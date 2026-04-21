FROM nginx:alpine
COPY index.html style.css script.js favicon.svg impressum.html datenschutz.html sitemap.xml robots.txt /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
