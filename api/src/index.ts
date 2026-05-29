import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.send('ClassInsight API (Node.js) is running smoothly.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
