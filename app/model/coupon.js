/**
 * 优惠券
 * 对应 coupons 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const CouponSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 63, trim: true },
    desc: { type: String, default: '', maxlength: 127, trim: true },
    tag: { type: String, default: '', maxlength: 63, trim: true }, // 标签
    total: { type: Number, default: 0 },  // 总库存
    discount: { type: Number, default: 0.00 }, // 折扣金额
    min: { type: Number, default: 0.00 },  // 最低消费
    limit: { type: Number, default: 1 }, // 领取数量
    type: { type: Number, default: 0, enum: [0, 1, 2] }, // 类型 0-满减 1-折扣券 2-现金券
    status: { type: Number, default: 0, enum: [0, 1, 2] },  // 状态 0-领取 1-已核销 2-过期
    goodsType: { type: Number, default: 0, enum: [0, 1, 2] }, //0-全部商品 1-指定分类 2-指定商品
    goodsValue: { type: String, default: '[]' }, // 商品列表
    code: { type: String, default: null, maxlength: 63, index: true },
    timeType: { type: Number, default: 0, enum: [0, 1] },
    days: { type: Number, default: 0 },
    startTime: { type: Date, default: null },  //生效时间
    endTime: { type: Date, default: null }, // 失效时间
    imageUrl: { type: String, default: '', maxlength: 255, trim: true }, // 封面图
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  CouponSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Coupon', CouponSchema);
};
