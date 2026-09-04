/**
 * 转盘抽奖活动
 * 对应 activities 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const ActivitySchema = new mongoose.Schema({
    userId: { type: String, default: null },
    perMax: { type: Number, default: 0 }, // 每个用户参与次数 0-无限
    deleted: { type: Boolean, default: false },
    isActive: { type: Number, default: 1 },  // 激活状态
    skinContent: { type: String, default: null, maxlength: 255 }, // 皮肤
    skinNo: { type: String, default: null, maxlength: 50 }, // 皮肤
    activityName: { type: String, default: null, maxlength: 50 }, // 标题
    awardCount: { type: Number, default: null },  //库存
    startTime: { type: Date, default: null },  //开始时间
    endTime: { type: Date, default: null }, // 结束时间
    awards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ActivityAward' }],
    qrCodeUrl: { type: String, default: null, maxlength: 500 },  //分享活动二维码图片地址
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  ActivitySchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Activity', ActivitySchema);
};
