import { catchAsync } from '../utils/index.js';
import BaseController from './baseController.js';
import eventService from '../services/eventService.js';

class EventController extends BaseController {
    constructor() {
        super();
    }

    // POST /gz/events/track — fire-and-forget, works for guests (anon_id)
    // and logged-in customers alike (optionalAuth attaches req.customer if
    // a valid token was sent, but never requires one).
    track = catchAsync(async (req, res) => {
        const {
            eventType, productId, categoryId, searchQuery, anonId,
            sellerId, orderId, sessionId, price, quantity, value, currency, deviceType, referrer,
            source, position, placement, productIds, positions, basedOn,
        } = req.body;

        const result = await eventService.trackEvent({
            customerId: req.customer?._id?.toString() || null,
            anonId: anonId || null,
            eventType,
            productId,
            categoryId,
            searchQuery,
            sellerId,
            orderId,
            sessionId,
            price,
            quantity,
            value,
            currency,
            deviceType,
            referrer,
            source,
            position,
            placement,
            productIds,
            positions,
            basedOn,
        });

        return this.sendResponse(res, result, 'Event tracked');
    });
}

export default new EventController();
