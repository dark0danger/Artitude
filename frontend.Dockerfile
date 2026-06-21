FROM node:20-slim
WORKDIR /app
COPY ui/package*.json ./
RUN npm install
COPY ui/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]