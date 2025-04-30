const express = require('express');
const router = express.Router();

// Define routes for user
router.get('/', (req, res) => {
    res.send('Product Routes');
});

router.post('/', (req, res) => {
    res.send('Create a new user');
});

module.exports = router;