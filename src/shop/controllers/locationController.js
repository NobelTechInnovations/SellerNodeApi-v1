import { catchAsync } from '../utils/index.js';
import BaseController from './baseController.js';
import { getCoordinates } from '../utils/googleAdress.js';

class LocationController extends BaseController {
    constructor() {
        super();
    }

    // Unauthenticated geocode wrapper — used by the buyer app's location
    // gate when a user denies/lacks browser geolocation and enters a
    // pincode or address manually instead. No auth required: guest
    // browsing must be able to set a location before ever logging in.
    resolve = catchAsync(async (req, res) => {
        const { pincode, address } = req.body;
        const query = address || pincode;

        if (!query) {
            return this.sendError(res, new Error('pincode or address is required'), 400);
        }

        const { latitude, longitude } = await getCoordinates(String(query));

        return this.sendResponse(res, {
            latitude,
            longitude,
            formatted_address: address || pincode
        }, 'Location resolved');
    });
}

export default new LocationController();
