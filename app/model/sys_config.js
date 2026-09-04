/**
 * 系统参数配置模型
 * 对应 sys_config 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysConfigSchema = new Schema({
    configName: { type: String },
    configKey: { type: String },
    configValue: { type: String },
    configType: { type: String, default: 'N' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_config',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysConfigSchema.index({ configKey: 1 }, { unique: true });

  return mongoose.model('SysConfig', SysConfigSchema);
};
