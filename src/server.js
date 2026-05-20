import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;

prisma.$connect().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
}).catch((error) => {
  console.error(`PostgreSQL connection failed: ${error.message}`);
  process.exit(1);
});
