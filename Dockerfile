FROM caddy:alpine
COPY index.html style.css script.js favicon.svg impressum.html datenschutz.html /srv/
COPY Caddyfile /etc/caddy/Caddyfile
