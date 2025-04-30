require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');


const app = express();


app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Function to load routes dynamically from the given API directory and version
function loadRoutesFromDirectory(apiVersion, apiType) {
    const apiDirectory = path.join(__dirname, 'routes', apiVersion, apiType);

    // Check if the API directory exists and is a directory
    if (fs.existsSync(apiDirectory) && fs.lstatSync(apiDirectory).isDirectory()) {
        const subDirs = fs.readdirSync(apiDirectory);

        subDirs.forEach(subDir => {
            const routeDirectory = path.join(apiDirectory, subDir);

            if (fs.lstatSync(routeDirectory).isDirectory()) {
                const routes = fs.readdirSync(routeDirectory);

                routes.forEach(routeFile => {
                    const routePath = path.join(routeDirectory, routeFile);

                    if (fs.lstatSync(routePath).isFile() && routeFile.endsWith('Routes.js')) {
                        try {
                            const route = require(routePath);
                            app.use(`/${apiVersion}/${apiType}/${subDir}`, route);
                            console.log(`Route mounted: /api/${apiVersion}/${apiType}/${subDir}`);
                        } catch (error) {
                            console.error(`Error loading route ${routePath}:`, error);
                        }
                    }
                });
            }
        });
    } else {
        console.log(`No routes found for ${apiVersion} > ${apiType}`);
    }
}

// Function to load all routes for all versions and API types
function loadAllRoutes() {
    try {
        const apiVersions = fs.readdirSync(path.join(__dirname, 'routes'));

        apiVersions.forEach(version => {
            const apiTypes = fs.readdirSync(path.join(__dirname, 'routes', version));

            apiTypes.forEach(apiType => {
                loadRoutesFromDirectory(version, apiType);
            });
        });
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


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
