import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';
import { createAttribute, updateAttribute, getAttribute, deleteAttribute } from '../../../../src/validators/products/attribute.js';
import * as attributeController from '../../../../src/controllers/products/attributeController.js';

const router = express.Router();

// Attribute Routes
router.post('/add', 
    adminAuth,
    createAttribute, 
    validate, 
    attributeController.createAttribute
);

router.get('/list', 
    adminAuth, 
    attributeController.getAttributes
);

router.get('/:attribute_id', 
    adminAuth, 
    getAttribute, 
    validate, 
    attributeController.getAttribute
);

router.put('/:attribute_id/update', 
    adminAuth,
    updateAttribute, 
    validate, 
    attributeController.updateAttribute
);

router.delete('/:attribute_id/delete', 
    adminAuth, 
    deleteAttribute, 
    validate, 
    attributeController.deleteAttribute
);

export default router; 