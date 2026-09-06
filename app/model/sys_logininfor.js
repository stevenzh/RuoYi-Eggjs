/**
 * 登录日志模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysLogininforSchema = new Schema({
    userName: { type: String },
    ipaddr: { type: String },
    loginLocation: { type: String },
    browser: { type: String },
    os: { type: String },
    status: { type: String, default: '0' },
    msg: { type: String },
    loginTime: { type: Date, default: Date.now },
  }, {
    collection: 'sys_logininfor',
  });

  SysLogininforSchema.index({ status: 1 });
  SysLogininforSchema.index({ loginTime: -1 });

  return mongoose.model('SysLogininfor', SysLogininforSchema);
};
