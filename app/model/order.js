/**
 * 订单
 * 对应 orders 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  // 物流信息
  const LogisticsSchema = new mongoose.Schema({
    logisticsType: { type: Number, default: 1 },
    logisticsNo: { type: String, default: '' },
    logisticsStatus: { type: Number, default: null },
    logisticsCompanyCode: { type: String, default: '' },
    logisticsCompanyName: { type: String, default: '' },
    receiverAddressId: { type: String, default: '' },
    provinceCode: { type: String, default: '' },
    cityCode: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    receiverProvince: { type: String, default: '' },
    receiverCity: { type: String, default: '' },
    receiverCountry: { type: String, default: '' },
    receiverArea: { type: String, default: '' },
    receiverAddress: { type: String, default: '' },
    receiverPostCode: { type: String, default: '' },
    receiverLongitude: { type: String, default: '' },
    receiverLatitude: { type: String, default: '' },
    receiverIdentity: { type: String, default: '' },
    receiverPhone: { type: String, default: '' },
    receiverName: { type: String, default: '' },
    expectArrivalTime: { type: Date, default: null },
    senderName: { type: String, default: '' },
    senderPhone: { type: String, default: '' },
    senderAddress: { type: String, default: '' },
    sendTime: { type: Date, default: null },
    arrivalTime: { type: Date, default: null },
  }, { _id: false });

  // 支付信息
  const PaymentSchema = new mongoose.Schema({
    payStatus: { type: Number, default: 0 },
    amount: { type: Number, default: null },
    currency: { type: String, default: null },
    payType: { type: Number, default: null },
    payWay: { type: Number, default: null },
    payWayName: { type: String, default: null },
    interactId: { type: String, default: null },
    traceNo: { type: String, default: null },
    channelTrxNo: { type: String, default: null },
    period: { type: Number, default: null },
    payTime: { type: Date, default: null },
    paySuccessTime: { type: Date, default: null },
  }, { _id: false });

  const OrderSchema = new mongoose.Schema({
    saasId: { type: String, default: '', index: true },
    storeId: { type: String, default: '' },
    storeName: { type: String, default: '', maxlength: 127, trim: true },
    uid: { type: String, default: '', index: true },
    parentOrderNo: { type: String, default: '' },
    orderId: { type: String, default: '', index: true },
    orderNo: { type: String, default: '', unique: true, index: true },
    orderType: { type: Number, default: 0 },
    orderSubType: { type: Number, default: 0 },
    orderStatus: { type: Number, default: 0 },
    orderSubStatus: { type: Number, default: null },
    orderStatusName: { type: String, default: '' },
    orderStatusRemark: { type: String, default: '' },
    totalAmount: { type: Number, default: null },
    goodsAmount: { type: Number, default: null },
    goodsAmountApp: { type: Number, default: null },
    paymentAmount: { type: Number, default: null },
    freightFee: { type: Number, default: null },
    packageFee: { type: Number, default: null },
    discountAmount: { type: Number, default: null },
    couponAmount: { type: Number, default: null },
    channelType: { type: Number, default: 0 },
    channelSource: { type: String, default: '' },
    channelIdentity: { type: String, default: '' },
    remark: { type: String, default: '' },
    cancelType: { type: Number, default: null },
    cancelReasonType: { type: Number, default: null },
    cancelReason: { type: String, default: null },
    rightsType: { type: Number, default: null },
    autoCancelTime: { type: Date, default: null },
    invoiceStatus: { type: Number, default: null },
    invoiceDesc: { type: String, default: null },
    invoiceUrl: { type: String, default: null },
    orderItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }],
    logistics: { type: LogisticsSchema, default: () => ({}) },
    payment: { type: PaymentSchema, default: () => ({}) },
    reviewStatus: { type: Number, default: 0, enum: [0, 1, 2] },
    reviewRemark: { type: String, default: '', maxlength: 511 },
    reviewTime: { type: Date, default: null },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  OrderSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Order', OrderSchema);
};
