FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 KD_DATA_DIR=/app/data KD_SECURE_COOKIES=enabled
WORKDIR /app
COPY --chown=node:node package.json auth.mjs credits.mjs deposits.mjs recharge-quotes.mjs coding-workspaces.mjs coding-sandbox.mjs coding-agent.mjs coding-export.mjs coding-diff.mjs coding-preview.mjs runtime-catalog.mjs storage.mjs runner-client.mjs admin-cli.mjs sample-project.mjs server.mjs ./
COPY --chown=node:node runtime/package.json ./runtime/package.json
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--use-env-proxy", "server.mjs"]
