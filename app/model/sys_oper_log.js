/**
 * 操作日志模型
 * 对应 MySQL sys_oper_log 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysOperLogSchema = new Schema({
    title: { type: String },
    businessType: { type: Number, default: 0 },
    method: { type: String },
    requestMethod: { type: String },
    operatorType: { type: Number, default: 0 },
    operName: { type: String },
    deptName: { type: String },
    operUrl: { type: String },
    operIp: { type: String },
    operLocation: { type: String },
    operParam: { type: String },
    jsonResult: { type: String },
    status: { type: Number, default: 0 },
    errorMsg: { type: String },
    operTime: { type: Date, default: Date.now },
    costTime: { type: Number, default: 0 },
  }, {
    collection: 'sys_oper_log',
  });

  SysOperLogSchema.index({ businessType: 1 });
  SysOperLogSchema.index({ status: 1 });
  SysOperLogSchema.index({ operTime: -1 });

  return mongoose.model('SysOperLog', SysOperLogSchema);
};
