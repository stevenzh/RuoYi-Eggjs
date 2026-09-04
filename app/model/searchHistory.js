/**
 * 搜索历史
 * 对应 searchhistories 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const SearchHistorySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    keyword: { type: String, required: true, maxlength: 63, trim: true, index: true },
    from: { type: String, default: '', maxlength: 63, trim: true },
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  SearchHistorySchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  // 唯一索引：同一用户的同一关键词只保留一条
  SearchHistorySchema.index({ userId: 1, keyword: 1 }, { unique: true });

  return mongoose.model('SearchHistory', SearchHistorySchema);
};
