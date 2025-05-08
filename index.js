import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import logger from './src/middleware/logger.js';
import errorHandler from './src/middleware/errorHandler.js';
import connectDB from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Middleware for JSON and URL-encoded form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger);

// Make multer upload available globally
app.locals.upload = upload;

// Connect to MongoDB
connectDB();

// Function to load routes dynamically from the given API directory and version
async function loadRoutesFromDirectory(apiVersion, apiType) {
    const apiDirectory = path.join(__dirname, 'routes', apiVersion, apiType);

    // Check if the API directory exists and is a directory
    if (fs.existsSync(apiDirectory) && fs.lstatSync(apiDirectory).isDirectory()) {
        const subDirs = fs.readdirSync(apiDirectory);

        for (const subDir of subDirs) {
            const routeDirectory = path.join(apiDirectory, subDir);

            if (fs.lstatSync(routeDirectory).isDirectory()) {
                const routes = fs.readdirSync(routeDirectory);

                for (const routeFile of routes) {
                    const routePath = path.join(routeDirectory, routeFile);

                    if (fs.lstatSync(routePath).isFile() && routeFile.endsWith('Routes.js')) {
                        try {
                            const route = await import(routePath);
                            app.use(`/${apiVersion}/${apiType}/${subDir}`, route.default);
                            console.log(`Route mounted: /api/${apiVersion}/${apiType}/${subDir}`);
                        } catch (error) {
                            console.error(`Error loading route ${routePath}:`, error);
                        }
                    }
                }
            }
        }
    } else {
        console.log(`No routes found for ${apiVersion} > ${apiType}`);
    }
}

// Function to load all routes for all versions and API types
async function loadAllRoutes() {
    try {
        const apiVersions = fs.readdirSync(path.join(__dirname, 'routes'));

        for (const version of apiVersions) {
            const apiTypes = fs.readdirSync(path.join(__dirname, 'routes', version));

            for (const apiType of apiTypes) {
                await loadRoutesFromDirectory(version, apiType);
            }
        }
    } catch (error) {
        console.error('Error loading routes:', error);
    }
}

// Load all routes dynamically
loadAllRoutes();

// Example of a base route
app.get('/', (req, res) => {
    res.send('Welcome to the Dynamic API');
});

// Error handling middleware (should be the last middleware)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
