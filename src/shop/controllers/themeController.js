import BaseController from './baseController.js';
import BaseService from '../services/baseService.js';
import { catchAsync } from '../utils/index.js';
import MobileCategory from '../constants/mobileCategory.js';

class ThemeController extends BaseController {
    constructor() {
        super();
        this.baseService = new BaseService();
    }

    header = catchAsync(async (req, res) => {
        return this.sendResponse(res, MobileCategory,
        );
    })

}

export default new ThemeController();
