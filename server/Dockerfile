FROM node:22-alpine

WORKDIR /app
COPY core.mjs node-server.mjs ./

ENV PORT=8787
ENV ALLOWED_ORIGINS=*
EXPOSE 8787

# 运行时注入：docker run -e DEEPSEEK_API_KEY=sk-xxx -p 8787:8787 <image>
CMD ["node", "node-server.mjs"]
