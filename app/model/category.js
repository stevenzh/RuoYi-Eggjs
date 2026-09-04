/**
 * 商品分类
 * 对应 categories 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 63, trim: true },  // 名称
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    desc: { type: String, default: '', maxlength: 127, trim: true },
    thumbnail: { type: String, default: '', maxlength: 255, trim: true }, //缩略图
    level: { type: Number, default: 1 }, // 等级
    sortOrder: { type: Number, default: 0 },  // 权重
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  CategorySchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Category', CategorySchema);
};
