class FeeService {
  
  constructor({ config = {} } = {}) {
    this.platformFee = config.platformFee ?? 10;
    this.handlingFee = config.handlingFee ?? 2;
    this.deliveryFeeForNonPrime = config.deliveryFeeForNonPrime ?? 20;
  }

  getPlatformFee() {
    return Number(this.platformFee);
  }

  getHandlingFee() {
    return Number(this.handlingFee);
  }

  /**
   * delivery fee depends on whether the customer is prime (paid)
   * @param {Object|null} customer
   */
  getDeliveryFee(customer) {
    const accountLevel = customer?.accountLevel;
    const isPrime = typeof accountLevel === 'string' && accountLevel.toLowerCase() === 'paid';
    return isPrime ? 0 : Number(this.deliveryFeeForNonPrime);
  }

  /**
   * Returns a fees object (numbers).
   */
  computeFees(customer) {
    return {
      platform_fee_amount: this.getPlatformFee(),
      handling_fee_amount: this.getHandlingFee(),
      delivery_fee_amount: this.getDeliveryFee(customer)
    };
  }
}

export default new FeeService();