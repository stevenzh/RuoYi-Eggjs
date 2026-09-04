/**
 * 转盘抽奖活动奖项
 * 对应 activityawards 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const ActivityAwardSchema = new mongoose.Schema({
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },  // 活动ID
    awardLevel: { type: Number }, // 等级
    awardGroup: { type: Number, default: 0 },
    proportion: { type: Number }, // 概率
    awardName: { type: String },  // 奖项名称
    awardCount: { type: Number }, // 库存
    awardType: { type: Number }, // 0-谢谢参与 1-红包 2-优惠券 3-积分 4-礼品
    usedCount: { type: Number, default: 0 }, //发放奖项数量
    bonusAmount: { type: Number },       //红包金额
    couponId: { type: String },          //换购券编号id
    giftId: { type: String },            //实物奖编号Id
    imageUrl: { type: String },
    integral: { type: Number, default: 0 }, //积分
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  ActivityAwardSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('ActivityAward', ActivityAwardSchema);
};
