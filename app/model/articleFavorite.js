/**
 * 会员收藏文章
 * 对应 articlefavorites 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const ArticleFavoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
    favoriteTime: { type: Date, default: Date.now },
  }, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  ArticleFavoriteSchema.index({ userId: 1, articleId: 1 }, { unique: true });

  return mongoose.model('ArticleFavorite', ArticleFavoriteSchema);
};
