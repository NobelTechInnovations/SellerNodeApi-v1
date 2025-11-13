export default class CustomerRepository {
    constructor({ CustomerModel }) {
        this.CustomerModel = CustomerModel;
    }


    async findById(customerId) {
        return this.CustomerModel.findById(customerId);
    }
}