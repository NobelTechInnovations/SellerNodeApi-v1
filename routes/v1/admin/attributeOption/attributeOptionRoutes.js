import express from 'express';
import { validate } from '../../../../src/middleware/validate.js';
import adminAuth from '../../../../src/middleware/adminAuth.js';
import { createAttributeOption, updateAttributeOption, getAttributeOption, deleteAttributeOption } from '../../../../src/validators/products/attributeOption.js';
import * as attributeOptionController from '../../../../src/controllers/products/attributeOptionController.js';

const router = express.Router();

// Attribute Option Routes
router.post('/create', 
    adminAuth,
    createAttributeOption, 
    validate, 
    attributeOptionController.createAttributeOption
);

router.get('/list', 
    adminAuth, 
    attributeOptionController.getAttributeOptions
);

router.get('/:option_id', 
    adminAuth, 
    getAttributeOption, 
    validate, 
    attributeOptionController.getAttributeOption
);

router.put('/:option_id/update', 
    adminAuth,
    updateAttributeOption, 
    validate, 
    attributeOptionController.updateAttributeOption
);

router.delete('/:option_id/delete', 
    adminAuth, 
    deleteAttributeOption, 
    validate, 
    attributeOptionController.deleteAttributeOption
);

export default router; 