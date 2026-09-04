/**
 * 订单明细
 * 对应 orderitems 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const OrderItemSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    spuId: { type: String, default: '' },
    skuId: { type: String, default: '' },
    roomId: { type: String, default: null },
    goodsMainType: { type: Number, default: 0 },
    goodsViceType: { type: Number, default: 0 },
    goodsName: { type: String, default: '', maxlength: 255, trim: true },
    specifications: [{
      specTitle: { type: String, default: '' },
      specValue: { type: String, default: '' },
    }],
    goodsPictureUrl: { type: String, default: '', maxlength: 511 },
    originPrice: { type: String, default: '0' },
    actualPrice: { type: String, default: '0' },
    buyQuantity: { type: Number, default: 1 },
    itemTotalAmount: { type: String, default: '0' },
    itemDiscountAmount: { type: String, default: '0' },
    itemPaymentAmount: { type: String, default: '0' },
    goodsPaymentPrice: { type: String, default: '0' },
    tagPrice: { type: String, default: null },
    tagText: { type: String, default: null },
    outCode: { type: String, default: null },
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  OrderItemSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('OrderItem', OrderItemSchema);
};
