/**
 * 会员领取优惠券
 * 对应 usercoupons 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const UserCouponSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    used: { type: Boolean, default: false },  // 使用状态
    useTime: { type: Date },  // 核销时间
    startTime: { type: Date }, // 生效时间
    endTime: { type: Date },  // 失效时间
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
  });

  UserCouponSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('UserCoupon', UserCouponSchema);
};
