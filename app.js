import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

// Import routes
import disasterRoutes from './routes/disasters.js';
import socialMediaRouts from './routes/socialMedia.js';
// const resourceRoutes = require('./routes/resources');
// const updateRoutes = require('./routes/updates');
// const verificationRoutes = require('./routes/verification');
// const geocodingRoutes = require('./routes/geocoding');

// Import middleware
// const errorHandler = require('./middleware/errorHandler');
// const { basic: rateLimiter } = require('./middleware/rateLimiter');

const app = express();
// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true }));
// app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/disasters', socialMediaRouts);
// app.use('/api/disasters', socialMediaRoutes);
// app.use('/api/disasters', resourceRoutes);
// app.use('/api/disasters', updateRoutes);
// app.use('/api/disasters', verificationRoutes);
// app.use('/api/geocode', geocodingRoutes);

// Error handling
// app.use(errorHandler);

// 404 handler
// app.use('/*', (req, res) => {
//     res.status(404).json({ error: 'Route not found' });
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


export default app;

