export default class CartRepository {
    constructor({ CartModel }) {
        this.CartModel = CartModel;
    }


    async findById(cartId) {
        return this.CartModel.findById(cartId);
    }
}