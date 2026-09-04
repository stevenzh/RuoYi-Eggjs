/**
 * 商品
 * 对应 goodstags 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const GoodsTagSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 63, trim: true, unique: true },
    color: { type: String, default: '#1890ff', maxlength: 20, trim: true },
    sortOrder: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  GoodsTagSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('GoodsTag', GoodsTagSchema);
};
