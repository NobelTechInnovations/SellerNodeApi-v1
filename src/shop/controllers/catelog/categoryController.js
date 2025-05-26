import { catchAsync } from '../../utils/index.js';
import  BaseController  from '../baseController.js';
import categoryService from '../../services/categoryService.js';

class CategoryController extends BaseController {
    constructor() {
        super();
    }

    categoryListing = catchAsync(async (req, res) => {
        const limit = parseInt(req.query.limit) || 8;  // Default limit to 8 if not provided
        const result = await categoryService.categoryListing(req.query, limit);
        return this.sendResponse(res, result, 'Category listing fetched');
    });


    categoryItems = catchAsync(async (req, res) => {
        const result = await categoryService.categoryItems(req.params.categoryId);
        return this.sendResponse(res, result, 'Category items fetched');
    });

    
}

export default new CategoryController();