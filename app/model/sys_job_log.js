/**
 * 定时任务日志模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysJobLogSchema = new Schema({
    jobName: { type: String },
    jobGroup: { type: String, default: 'DEFAULT' },
    invokeTarget: { type: String },
    jobMessage: { type: String },
    status: { type: String, default: '0' },
    exceptionInfo: { type: String },
    createTime: { type: Date, default: Date.now },
  }, {
    collection: 'sys_job_log',
  });

  SysJobLogSchema.index({ jobName: 1, jobGroup: 1 });
  SysJobLogSchema.index({ status: 1 });
  SysJobLogSchema.index({ createTime: -1 });

  return mongoose.model('SysJobLog', SysJobLogSchema);
};
