/**
 * 字典数据模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysDictDataSchema = new Schema({
    dictSort: { type: Number, default: 0 },
    dictLabel: { type: String },
    dictValue: { type: String },
    dictType: { type: String },
    cssClass: { type: String },
    listClass: { type: String },
    isDefault: { type: String, default: 'N' },
    status: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_dict_data',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysDictDataSchema.index({ dictType: 1 });
  SysDictDataSchema.index({ dictSort: 1 });

  return mongoose.model('SysDictData', SysDictDataSchema);
};
