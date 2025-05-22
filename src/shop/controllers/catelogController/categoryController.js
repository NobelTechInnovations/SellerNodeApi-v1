// this is api url for category - gz/category/listing?tree=true&main-category=

import { catchAsync } from '../../utils/index.js';
import  BaseController  from '../baseController.js';
import categoryService from '../../services/categoryService.js';

class CategoryController extends BaseController {
    constructor() {
        super();
    }

    categoryListing = catchAsync(async (req, res) => {
        const result = await categoryService.categoryListing(req.query);
        return this.sendResponse(res, result, 'Category listing fetched');
    });
}

export default new CategoryController();