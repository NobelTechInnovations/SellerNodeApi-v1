const express = require('express');
const router = express.Router();

// Mock data to simulate a database for orders
let orders = [
    { id: 1, productId: 101, quantity: 2, status: 'pending' },
    { id: 2, productId: 102, quantity: 1, status: 'shipped' },
];

// Route to get all orders
router.get('/', (req, res) => {
    res.status(200).json(orders);
});

module.exports = router;