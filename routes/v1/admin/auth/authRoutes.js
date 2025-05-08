const express = require('express');
const router = express.Router();

const AdminController = require('../../../../src/controllers/adminController');

router.post('/',AdminController.login);

module.exports = router;