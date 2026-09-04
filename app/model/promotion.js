/**
 * 营销活动
 * 对应 promotions 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const PromotionSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 127, trim: true },  // 活动标题
    description: { type: String, default: null, maxlength: 511, trim: true }, // 活动描述
    promotionCode: { type: String, required: true, maxlength: 63, trim: true },  // 活动编码
    promotionSubCode: { type: String, default: '', maxlength: 63, trim: true },  // 活动子编码
    tag: { type: String, default: '', maxlength: 63, trim: true }, // 标签
    timeType: { type: Number, default: 1, enum: [0, 1] },
    startTime: { type: Date, default: null },  // 活动开始时间
    endTime: { type: Date, default: null },  // 活动结束时间
    teasingStartTime: { type: Date, default: null }, // 预热开始时间
    activityLadder: [{
      label: { type: String, default: '', maxlength: 127, trim: true },
    }], // 活动阶梯规则
    isActive: { type: Boolean, default: true }, // 激活状态
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  PromotionSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Promotion', PromotionSchema);
};
