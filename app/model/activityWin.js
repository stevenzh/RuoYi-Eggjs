/**
 * 转盘抽奖中奖记录
 * 对应 activitywins 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const ActivityWinSchema = new mongoose.Schema({
    userId: { type: String, required: true },  // 参与抽奖用户ID
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },  // 活动ID
    awardId: { type: String, default: null },  // 奖项ID
    awardName: { type: String, default: null, maxlength: 255 }, // 奖项名称
    awardType: { type: Number }, // 0-谢谢参与 1-红包 2-优惠券 3-积分 4-礼品
    activityName: { type: String, default: null, maxlength: 255 },  // 活动名称
    awardGroup: { type: Number, deafult: 0 },
    userName: { type: String, default: null, maxlength: 255 }, // 用户名称
    avatarUrl: { type: String, default: null, maxlength: 255 },  // 头像
    status: { type: Number, default: 0 }, //0.未领取 1.领取中 2-领取失败 9.已领取
    usedTime: { type: Date }, //领取时间
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  ActivityWinSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('ActivityWin', ActivityWinSchema);
};
