/**
 * 前端文章
 * 对应 articles 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const ArticleSchema = new mongoose.Schema({
    type: { type: String, required: true, maxlength: 20, trim: true }, // 分类
    title: { type: String, maxlength: 255, trim: true, default: null },  // 标题
    content: { type: String, default: null },  // 内容
    tags: { type: [String], default: [] }, // 标签
    url: { type: String, default: '', trim: true }, // 连接地址
    images: { type: [String], default: [] },
    status: { type: Number, default: 0 },  // 0-初始 1-审核中 2-审核失败 5-发布
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted: { type: Boolean, default: false },
    approvedTime: { type: Date, default: null },  // 审核时间
    rejectReason: { type: String, default: null }, // 不通过原因
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },  // 审核人
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  ArticleSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Article', ArticleSchema);
};
