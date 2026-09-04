/**
 * 会员收货地址
 * 对应 addresses 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const AddressSchema = new mongoose.Schema({
    name: { type: String, required: true, default: '', maxlength: 63, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, default: null },
    provinceId: { type: Number, default: 0 },
    cityId: { type: Number, default: 0 },
    areaId: { type: Number, default: 0 },
    address: { type: String, default: '', maxlength: 127, trim: true },
    mobile: { type: String, default: '', maxlength: 20, trim: true },
    isDefault: { type: Boolean, default: false },  // 默认地址
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  AddressSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Address', AddressSchema);
};
