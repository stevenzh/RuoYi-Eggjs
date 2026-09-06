/**
 * 字典类型模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysDictTypeSchema = new Schema({
    dictName: { type: String },
    dictType: { type: String },
    status: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_dict_type',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysDictTypeSchema.index({ dictType: 1 }, { unique: true });

  return mongoose.model('SysDictType', SysDictTypeSchema);
};
