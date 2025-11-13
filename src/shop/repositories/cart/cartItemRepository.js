export class CartItemRepository {
    constructor({ CartItemModel }) {
        this.CartItemModel = CartItemModel;
    }


    async findByCartId(cartId) {
        return this.CartItemModel.find({ cartId }).sort({ createdAt: -1 });
    }
}