import { catchAsync } from '../../utils/index.js';
import  BaseController  from '../baseController.js';
import categoryService from '../../services/categoryService.js';

class CategoryController extends BaseController {
    constructor() {
        super();
    }

    categoryListing = catchAsync(async (req, res) => {
        const limit = parseInt(req.query.limit) || 5;  // Default limit to 5 if not provided
        const result = await categoryService.categoryListing(limit);
        return this.sendResponse(res, result, 'Category listing fetched');
    });
    
}

export default new CategoryController();