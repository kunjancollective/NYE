FROM node:24.15.0-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p .data private-media && chown -R node:node .data private-media
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
